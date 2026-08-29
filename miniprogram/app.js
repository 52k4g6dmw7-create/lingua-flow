// app.js
const i18n = require('./utils/i18n.js');
const cloud = require('./utils/cloud.js');
const api = require('./utils/api.js');
const CONFIG = require('./config.js');

App({
  onLaunch: function () {
    // ====== 云开发初始化（最先执行） ======
    this.initCloud();

    // ====== 初始化多语言 ======
    this.globalData.currentLang = i18n.getLang();
    this.globalData.locale = i18n.getLocale();

    // ====== 获取系统信息 ======
    try {
      const sysInfo = wx.getSystemInfoSync();
      this.globalData.systemInfo = sysInfo;
      this.globalData.statusBarHeight = sysInfo.statusBarHeight || 20;
      const menuButton = wx.getMenuButtonBoundingClientRect();
      if (menuButton) {
        this.globalData.navBarHeight = (menuButton.top - this.globalData.statusBarHeight) * 2 + menuButton.height;
        this.globalData.menuButton = menuButton;
      }
    } catch (e) {
      console.warn('获取系统信息失败', e);
      this.globalData.statusBarHeight = 20;
      this.globalData.navBarHeight = 44;
    }

    // ====== 恢复本地登录态 ======
    try {
      const savedOpenid = wx.getStorageSync('ls_openid');
      const savedUser = wx.getStorageSync('ls_user');
      if (savedOpenid) this.globalData.openid = savedOpenid;
      if (savedUser) this.globalData.user = savedUser;
    } catch (e) {}

    // ====== 静默尝试登录（非阻塞） ======
    this.silentLogin();

    // ====== 进度数据 ======
    this.initProgressData();

    // ====== 会员状态异步刷新（不阻塞启动，在用到 requireVip 时会再次确保） ======
    setTimeout(() => { this.refreshVipStatus().catch(() => {}); }, 800);
  },

  onShow: function () {
    // 每次进入前台刷新语言包
    this.refreshLocale();
    this.updateTabBarTexts();
    // 尝试刷新用户活跃时间
    if (this.globalData.openid) {
      api.updateUser({ lastActiveAt: Date.now() }).catch(() => {});
    }
    // 回到前台也刷新会员状态（判断免费时间是否到期）
    setTimeout(() => { this.refreshVipStatus().catch(() => {}); }, 300);
  },

  // ===== 云开发初始化 =====
  initCloud: function () {
    const that = this;
    cloud.init().then((ready) => {
      that.globalData.cloudReady = ready;
      if (!ready) {
        if (CONFIG.FEATURES.DEBUG) {
          console.warn('[app] 云开发未就绪，本地降级模式');
        }
        // 只在首次启动未配置时弹窗提醒（发布给客户前很重要）
        try {
          const alerted = wx.getStorageSync('ls_cloud_alerted');
          if (!alerted && !CONFIG.isCloudConfigured()) {
            wx.setStorageSync('ls_cloud_alerted', true);
            setTimeout(() => {
              wx.showModal({
                title: '⚠️ 尚未配置云开发',
                content: '为保证真实登录、评分同步、进度保存等功能可用，请在 config.js 填写您的云开发环境 CLOUD_ENV。\n\n详细步骤请查看 miniprogram/DEPLOY_CHECKLIST.md',
                confirmText: '我知道了',
                showCancel: false
              });
            }, 600);
          }
        } catch (e) {}
      } else {
        // 检查同声传译插件
        try {
          const p = requirePlugin && requirePlugin('WechatSI');
          that.globalData.wechatSIAvailable = !!p;
          if (!p && CONFIG.FEATURES.ENABLE_SPEECH_EVAL) {
            console.warn('[app] 同声传译插件不可用，请在公众平台添加');
          }
        } catch (e) {
          that.globalData.wechatSIAvailable = false;
        }
      }
    });
  },

  // ===== 静默登录：拿 openid + 同步用户（不弹窗，失败不阻塞） =====
  silentLogin: function () {
    const that = this;
    api.login().then((res) => {
      if (res && res.success) {
        that.setLoginSession(res.openid, res.user);
      }
    }).catch((err) => {
      console.warn('[app] 静默登录失败，使用降级模式', err && err.errMsg);
    });
  },

  // ===== 对外：显式登录（点按钮时调用，会提示加载中） =====
  doLogin: function () {
    const that = this;
    wx.showLoading({ title: '登录中...', mask: true });
    return api.login().then((res) => {
      wx.hideLoading();
      if (res && res.success) {
        that.setLoginSession(res.openid, res.user);
        wx.showToast({ title: res._fallback ? '本地模式登录' : '登录成功', icon: 'success' });
        return res;
      }
      throw new Error('login fail');
    }).catch((err) => {
      wx.hideLoading();
      wx.showToast({ title: i18n.t('common.fail'), icon: 'error' });
      throw err;
    });
  },

  // ===== 写登录态到全局 + 本地 =====
  setLoginSession: function (openid, user) {
    this.globalData.openid = openid || '';
    this.globalData.user = user || null;
    try {
      if (openid) wx.setStorageSync('ls_openid', openid);
      if (user) wx.setStorageSync('ls_user', user);
    } catch (e) {}
  },

  // ===== 登出 =====
  logout: function () {
    this.globalData.openid = '';
    this.globalData.user = null;
    try {
      wx.removeStorageSync('ls_openid');
      wx.removeStorageSync('ls_user');
    } catch (e) {}
  },

  // ===== 是否已登录（有真实 openid） =====
  isLoggedIn: function () {
    return !!(this.globalData.openid && this.globalData.openid.length > 0);
  },

  // 刷新语言包
  refreshLocale: function () {
    this.globalData.currentLang = i18n.getLang();
    this.globalData.locale = i18n.getLocale();
  },

  // 切换语言
  switchLanguage: function (langCode) {
    const success = i18n.setLang(langCode);
    if (success) {
      this.refreshLocale();
      this.updateTabBarTexts(langCode);
      // 同步用户偏好语言
      if (this.isLoggedIn()) {
        api.updateUser({ lang: langCode }).catch(() => {});
      }
    }
    return success;
  },

  // 更新TabBar文案
  updateTabBarTexts: function (lang) {
    const useLang = lang || this.globalData.currentLang;
    const locale = i18n.getLocale(useLang);
    if (!locale || !locale.tabBar) return;
    try {
      wx.setTabBarItem({ index: 0, text: locale.tabBar.home });
      wx.setTabBarItem({ index: 1, text: locale.tabBar.discover });
      wx.setTabBarItem({ index: 2, text: locale.tabBar.upload });
      wx.setTabBarItem({ index: 3, text: locale.tabBar.settings });
    } catch (e) {
      // tabBar 未渲染时会报，忽略
    }
  },

  // 初始化进度数据：先云优先，失败再本地
  initProgressData: function () {
    const that = this;
    const progressKey = 'linguaspeak_progress';
    const defaultProgress = {
      consecutiveDays: 2,
      totalDays: 17,
      totalMinutes: 66,
      currentWeek: 1,
      currentDayOfWeek: 17,
      currentPlan: '',
      masteringSkills: [
        { id: 1, nameKey: 'conclusionFirst', progress: 15, status: 'start' }
      ],
      lastActiveDate: this.getTodayStr()
    };

    // 先用同步本地兜底（保证立即显示）
    try {
      const local = wx.getStorageSync(progressKey);
      if (local && typeof local === 'object') {
        that.globalData.progress = Object.assign({}, defaultProgress, local);
      } else {
        wx.setStorageSync(progressKey, defaultProgress);
        that.globalData.progress = defaultProgress;
      }
    } catch (e) {
      that.globalData.progress = defaultProgress;
    }

    // 异步：尝试从云库拉取覆盖（如果有登录态）
    if (CONFIG.isCloudConfigured()) {
      setTimeout(() => {
        api.getProgress().then((cloudProgress) => {
          if (cloudProgress && typeof cloudProgress === 'object' && cloudProgress.totalDays !== undefined) {
            that.globalData.progress = cloudProgress;
            try { wx.setStorageSync(progressKey, cloudProgress); } catch (e) {}
          }
        }).catch(() => {
          // 忽略云端失败，保留本地
        });
      }, 500);
    }
  },

  // 获取进度数据（返回本地兜底，若云端返回更新会在下一次刷新）
  getProgress: function () {
    try {
      return wx.getStorageSync('linguaspeak_progress') || this.globalData.progress;
    } catch (e) {
      return this.globalData.progress;
    }
  },

  // 更新进度：写云 + 本地
  updateProgress: function (updates) {
    const progressKey = 'linguaspeak_progress';
    const current = this.getProgress() || {};
    const updated = Object.assign({}, current, updates);
    try {
      wx.setStorageSync(progressKey, updated);
      this.globalData.progress = updated;
    } catch (e) {}

    if (CONFIG.isCloudConfigured()) {
      // 异步写云，不阻塞
      api.updateProgress(updates).then((cloudRes) => {
        if (cloudRes && typeof cloudRes === 'object') {
          this.globalData.progress = cloudRes;
          try { wx.setStorageSync(progressKey, cloudRes); } catch (e) {}
        }
      }).catch((e) => {
        console.warn('[app] 云端更新进度失败', e);
      });
    }
    return updated;
  },

  // 获取今日日期字符串
  getTodayStr: function () {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  // ============================================================
  // 会员系统：全局状态 + 刷新 + 拦截
  // ============================================================

  /**
   * 刷新会员状态（静默，失败不阻塞）
   * 调用后：
   *   - globalData.vipStatus = { canUseCore, freeTrial, vip, _ui, ... }
   *   - 本地存到 ls_vip_status（下次启动先显示本地再异步刷新）
   */
  refreshVipStatus: function () {
    const that = this;
    // 开关关了直接放行（本地开发调试）
    if (CONFIG.FEATURES && CONFIG.FEATURES.ENABLE_VIP === false) {
      const allPass = {
        canUseCore: true, _bypass: true,
        freeTrial: { active: true, remainingMinutes: 9999 },
        vip: { active: true, planKey: 'bypass', isForever: true, daysLeft: Infinity },
        _ui: { needUpgrade: false, freeAlmostGone: false, expiredVip: false }
      };
      that.globalData.vipStatus = allPass;
      try { wx.setStorageSync('ls_vip_status', allPass); } catch (e) {}
      return Promise.resolve(allPass);
    }

    // 先读本地，UI 不闪
    try {
      const local = wx.getStorageSync('ls_vip_status');
      if (local && typeof local === 'object') that.globalData.vipStatus = local;
    } catch (e) {}

    return api.checkVipStatus().then((st) => {
      if (st && typeof st === 'object') {
        that.globalData.vipStatus = st;
        try { wx.setStorageSync('ls_vip_status', st); } catch (e) {}
      }
      return st || that.globalData.vipStatus || {};
    }).catch(() => {
      return that.globalData.vipStatus || { canUseCore: true, _fallback: true };
    });
  },

  /**
   * 同步读取会员状态（优先用已缓存的）
   */
  getVipStatus: function () {
    try {
      return this.globalData.vipStatus || wx.getStorageSync('ls_vip_status') || { canUseCore: true };
    } catch (e) {
      return { canUseCore: true };
    }
  },

  /**
   * 会员拦截：在进入朗读训练、上传等核心功能前调用
   * @param {string} from  来源页面标识，用于跳转回退
   * @param {object} opts  { silent: false, allowRetry: true }
   * @returns Promise<{pass: boolean, status}>  pass=true 表示可以放行
   */
  requireVip: function (from, opts) {
    opts = opts || {};
    const that = this;
    return that.refreshVipStatus().then((st) => {
      const status = st || {};
      if (status.canUseCore) return { pass: true, status: status };

      // 未通过 → 跳会员中心，同时带 redirect 参数（此处用全局 redirect 标记简化）
      if (opts.silent !== true) {
        try {
          wx.showModal({
            title: that._vipTitle(),
            content: that._vipContent(status),
            confirmText: that._vipConfirmText(status),
            cancelText: '稍后再说',
            confirmColor: '#2ecc71',
            success: (res) => {
              if (res.confirm) {
                wx.navigateTo({
                  url: '/pages/vip/vip?from=' + encodeURIComponent(from || '')
                });
              }
            }
          });
        } catch (e) {
          wx.navigateTo({ url: '/pages/vip/vip' });
        }
      }
      return { pass: false, status: status };
    });
  },

  _vipTitle: function () {
    const lang = i18n.getLang();
    if (lang === 'zh') return '免费体验已结束';
    if (lang === 'en') return 'Free Trial Ended';
    if (lang === 'ja') return '無料体験終了';
    if (lang === 'ko') return '무료 체험 종료';
    if (lang === 'fr') return 'Essai gratuit terminé';
    return 'Free Trial Ended';
  },
  _vipContent: function (st) {
    const lang = i18n.getLang();
    const expired = st && st._ui && st._ui.expiredVip;
    if (lang === 'zh') return expired ? '您的会员已过期，请续费继续使用完整功能。' : '1小时免费体验已结束，升级Pro继续训练～';
    if (lang === 'en') return expired ? 'Your membership has expired. Renew to continue.' : 'Your 1-hour trial has ended. Upgrade to Pro!';
    if (lang === 'ja') return expired ? '有効期限が切れました。更新して続けましょう。' : '1時間の無料体験が終了しました。Proへアップグレード！';
    if (lang === 'ko') return expired ? '회원권이 만료되었습니다. 갱신하고 계속하세요.' : '1시간 무료 체험이 종료되었습니다. Pro로 업그레이드!';
    if (lang === 'fr') return expired ? 'Votre abonnement a expiré. Renouvelez pour continuer.' : 'Votre essai d\'1 heure est terminé. Passez à Pro !';
    return 'Upgrade to continue.';
  },
  _vipConfirmText: function (st) {
    const lang = i18n.getLang();
    const expired = st && st._ui && st._ui.expiredVip;
    if (lang === 'zh') return expired ? '立即续费' : '立即开通';
    if (lang === 'en') return expired ? 'Renew Now' : 'Upgrade Now';
    if (lang === 'ja') return expired ? '更新する' : 'アップグレード';
    if (lang === 'ko') return expired ? '지금 갱신' : '지금 업그레이드';
    if (lang === 'fr') return expired ? 'Renouveler' : 'Passer à Pro';
    return 'Upgrade';
  },

  globalData: {
    // 云 & 登录
    cloudReady: false,
    wechatSIAvailable: false,
    openid: '',
    user: null,
    // 多语言
    currentLang: 'zh',
    locale: null,
    // 系统
    systemInfo: null,
    statusBarHeight: 20,
    navBarHeight: 44,
    menuButton: null,
    // 进度
    progress: null,
    // 会员状态
    vipStatus: null,
    // 训练内容库
    trainingLibrary: {
      interview: {
        zh: [
          '您好，我叫张三，毕业于北京大学计算机专业。',
          '我有三年的前端开发经验，熟悉React和Vue框架。',
          '我认为沟通能力和团队协作是项目成功的关键。',
          '在之前的工作中，我主导过两个大型项目的开发。',
          '我对新技术充满热情，并持续保持学习的态度。'
        ],
        en: [
          'Hello, my name is Zhang San. I graduated from Peking University with a degree in Computer Science.',
          'I have three years of front-end development experience and am proficient in React and Vue frameworks.',
          'I believe communication skills and teamwork are the keys to project success.',
          'In my previous role, I led the development of two large-scale projects.',
          'I am passionate about new technologies and maintain a continuous learning attitude.'
        ],
        ja: [
          'はじめまして、张三と申します。北京大学コンピューター学科を卒業しました。',
          'フロントエンド開発の経験が3年あり、ReactとVueに精通しています。',
          'コミュニケーション能力とチームワークがプロジェクト成功の鍵だと考えています。',
          '前職では、2つの大規模プロジェクトの開発をリードしました。',
          '新しい技術に情熱を持ち、常に学び続ける姿勢を大切にしています。'
        ],
        ko: [
          '안녕하세요, 저는 장산입니다. 북경대학교 컴퓨터공학과를 졸업했습니다.',
          '프론트엔드 개발 경력이 3년이며, React와 Vue 프레임워크에 능숙합니다.',
          '의사소통 능력과 팀워크가 프로젝트 성공의 열쇠라고 생각합니다.',
          '이전 직장에서 두 개의 대규모 프로젝트 개발을 주도했습니다.',
          '새로운 기술에 열정을 갖고 있으며, 지속적으로 배우는 자세를 유지하고 있습니다.'
        ],
        fr: [
          'Bonjour, je m\'appelle Zhang San. Je suis diplômé de l\'Université de Pékin en informatique.',
          'J\'ai trois ans d\'expérience en développement front-end et je maîtrise les frameworks React et Vue.',
          'Je pense que la communication et le travail d\'équipe sont la clé du succès d\'un projet.',
          'Dans mon précédent poste, j\'ai dirigé le développement de deux projets à grande échelle.',
          'Je suis passionné par les nouvelles technologies et j\'ai une attitude d\'apprentissage continu.'
        ]
      },
      dailyLife: {
        zh: [
          '我每天早上七点起床，先喝一杯温水再开始工作。',
          '周末我喜欢和朋友去附近的咖啡馆喝咖啡、聊天。',
          '最近我开始学习做饭，今天晚上准备尝试做番茄炒蛋。',
          '上海的交通很便利，地铁几乎可以到达任何地方。',
          '我觉得保持锻炼非常重要，每周至少跑步三次。'
        ],
        en: [
          'I get up at seven every morning, drink a glass of warm water, and then start working.',
          'On weekends, I like going to nearby cafes with my friends for coffee and a chat.',
          'Recently I started learning to cook; tonight I am going to try making tomato and egg stir-fry.',
          'Public transport in Shanghai is very convenient, and the subway can take you almost anywhere.',
          'I think it is important to keep exercising, so I go running at least three times a week.'
        ]
      },
      business: {
        en: [
          'Today I would like to walk you through our Q3 performance and outline key initiatives for next quarter.',
          'Our customer retention rate has improved by twelve percent thanks to the new onboarding flow.',
          'I recommend we prioritize three areas: product localization, channel partnerships, and after-sales support.',
          'Could we schedule a follow-up meeting next Tuesday to align on the detailed rollout plan?',
          'In summary, we achieved our revenue target while keeping operational costs below budget.'
        ]
      },
      debate: {
        en: [
          'From my perspective, online learning provides greater flexibility and democratizes access to education.',
          'However, we cannot ignore the fact that face-to-face interaction fosters deeper teamwork and discipline.',
          'The data clearly indicates that hybrid models yield the highest student satisfaction scores.',
          'Therefore, I argue that universities should adopt blended learning rather than move fully online.',
          'To conclude, the decision should balance convenience, pedagogical effectiveness, and equity.'
        ]
      },
      speech: {
        en: [
          'Three years ago, I stood on this very stage and failed spectacularly. Today I want to share what I learned.',
          'The first lesson is simple: progress beats perfection. Even one small step every day compounds over time.',
          'The second lesson is resilience. Every rejection, every setback, is data you can use to rebuild stronger.',
          'The third lesson is community. None of us succeeds alone; mentors and teammates accelerate growth.',
          'So tonight, I challenge each of you to take one tiny step outside your comfort zone before you sleep.'
        ]
      },
      ted: {
        en: [
          'Imagine waking up one morning and realizing the skill you feared most is the one that will transform your career.',
          'For most people, that skill is speaking clearly and confidently in front of others.',
          'The good news is that speaking, like cooking or cycling, is a trainable habit, not an innate talent.',
          'Research shows that people who read aloud for just fifteen minutes a day improve their fluency by thirty percent in three months.',
          'So pick up a paragraph today, read it out loud, and take the first step toward the voice you want.'
        ]
      },
      // ======================== IELTS Speaking 分级训练库（核心升级） ========================
      // IELTS Band 4.5-5.0: 基础生存语料 — 短句子、简单连接词（and/because）、高频 Part1 话题
      ielts_4_5: {
        en: [
          // Part 1 高频话题：Hometown / Work / Study / Accommodation / Hobbies
          'I come from a small city in the south of China. It is warm and quiet, and my family still lives there.',
          'I am a university student majoring in business. I go to class from Monday to Friday and study in the library in the evening.',
          'I live in an apartment near my university. I share a bedroom with one classmate, and we get along very well.',
          'In my free time, I usually listen to music or watch movies online. I also play badminton sometimes with my friends.',
          'My favorite season is spring because the weather is nice and everything looks green and fresh.',
          'I usually have breakfast at seven o\'clock. I eat bread and drink milk, then I walk to the office or campus.',
          'Last weekend I visited my grandparents. We had a big dinner together and talked about many old stories.',
          'I want to improve my English because I plan to study abroad next year, and I need a good IELTS score.',
          // Part 2 入门级：简短描述人物/地点（2-3 分句/句）
          'I want to talk about my English teacher. She is about thirty years old and she always smiles in class.',
          'I would like to describe a cafe I often go to. It is small but comfortable, and the coffee there is not expensive.',
          // Part 3 基础观点：给出简单原因
          'I think reading is important because we can learn new words and get more information from books.',
          'Yes, I believe children should do some housework. It helps them learn responsibility and practical daily skills.'
        ]
      },
      // IELTS Band 5.5-6.0: 进阶表达 — 连接词（however/therefore/in addition）、复合句、Part 2 Cue Card 完整答题
      ielts_5_5: {
        en: [
          // Part 1：回答由 2-3 个分句组成，给出简单扩展
          'Well, I have been working as a marketing executive for nearly two years now. Although the job can be stressful sometimes, I enjoy the creative tasks such as designing campaigns and writing social media posts.',
          'As for my accommodation, I currently rent a two-bedroom apartment with two friends in the city center. It is a bit noisy because it is close to the main road, but the location is really convenient for work.',
          'In terms of hobbies, I am really into photography these days. I usually take my camera out on weekends, especially when the weather is sunny, and I try to capture street scenes and local markets.',
          // Part 2：Cue Card 级长句（Describe a person / place / experience，150-180 词对应 7-8 句）
          'I would like to describe an experience when I traveled to Chengdu with my best friend last summer. We booked a cheap flight in advance and stayed in a small hotel near the city center for five days.',
          'During the trip, we visited several famous pandas bases, tried a lot of local Sichuan food, and walked through the ancient alleys every evening. What impressed me most was how friendly the local people were.',
          'One night, we got lost in a narrow street on our way back to the hotel, and a young couple helped us find the right direction. They even recommended a great restaurant nearby where we ate the best hot pot I have ever tasted.',
          'Overall, that trip was memorable not only because of the beautiful scenery but also because I realized how important it is to step outside my comfort zone and meet new people.',
          // Part 3：讨论观点，使用 "On one hand / On the other hand / Personally"
          'On one hand, advertising informs consumers about new products and helps them make better purchasing decisions. On the other hand, some advertisements are misleading and encourage people to buy things they do not really need.',
          'Personally, I think museums should be free for everyone. They play an important role in educating the public about history, culture, and science, and they also attract tourists which benefits the local economy.'
        ]
      },
      // IELTS Band 6.5-7.0: 高分表达 — 高级连接（consequently/nevertheless/by contrast）、虚拟语气、从句嵌套、话题词汇
      ielts_6_5: {
        en: [
          // Part 1：给出带个人感受 + 反例对比的回答
          'To be honest, I used to dislike public transport because buses in my hometown were often crowded and unreliable. However, since I moved to this city the metro system has been fantastic, and now I actually prefer traveling by subway to driving.',
          'Well, I am quite into reading historical novels at the moment. I find that they not only entertain me but also give me a deeper insight into how people lived in different periods, which is something I cannot easily get from textbooks.',
          // Part 2：长段落（200-250 词、地道搭配、语域自然）
          'I would like to talk about a piece of advice I received from my father when I was choosing my university major. At that time, I was torn between studying computer science, which seemed to offer better job prospects, and literature, which I was truly passionate about.',
          'My father told me that, in the long run, genuine interest is the most powerful driver of success. He said that if I chose a subject merely for its earning potential, I would probably burn out quickly and regret my decision later on.',
          'Thanks to his advice, I eventually chose literature. Consequently, I graduated with excellent grades, published several short stories in college magazines, and even won a national writing competition during my final year.',
          'Looking back, I really appreciate what my father said that day. It taught me that we should never let short-term practicality overshadow long-term personal fulfillment. Without his encouragement, I would not be enjoying my career as a content writer today.',
          // Part 3：论述型回答（cause-effect + concession + example）
          'There is no doubt that social media has reshaped the way people communicate. On the positive side, it enables us to stay in touch with friends and relatives regardless of geographical distance, and it also provides a platform for ordinary people to share their voices publicly.',
          'Nevertheless, we cannot deny the negative consequences. Heavy users often report increased levels of anxiety and loneliness, and teenagers in particular seem to be vulnerable to issues such as cyberbullying and unrealistic beauty standards promoted online.',
          'From my perspective, the most effective solution is not to ban social media entirely, but to teach digital literacy from an early age so that young users can consume content critically and maintain a healthy balance between online and offline life.'
        ]
      },
      // IELTS Band 7.5+: 冲刺表达 — 地道习语 / 学术型连接词 / 抽象话题深度讨论 / 观点 + 对比 + 数据化表达
      ielts_7_5: {
        en: [
          // Part 1 / Part 2 高级语域：自然、精炼，有修辞
          'If I had to sum up my attitude toward learning languages, I would say I approach them less as academic subjects and more as gateways to entirely different worldviews. Every idiom I pick up feels like a tiny piece of the puzzle of how another culture thinks.',
          'I recently took part in a debate competition on climate change, and what struck me most was not the arguments themselves, but how quickly the room became polarized once people felt their identities were tied to a particular position.',
          'I am a firm believer that travel, when done mindfully, is one of the most humbling and intellectually stimulating experiences we can have. It dismantles stereotypes we did not even know we held and forces us to rethink assumptions we take for granted.',
          // Part 2：长段 + 高级结构（倒装 / 分词状语 / 同位语从句 / 强调句）
          'Never have I encountered a book that had such a profound impact on my worldview as "Sapiens" did when I first read it during my gap year. What fascinated me was not the fact that it covered the entire history of humankind, but that it did so through a completely unconventional lens.',
          'The author argues that it is our ability to believe in shared myths — money, nations, human rights — that has allowed Homo sapiens to cooperate in large numbers and dominate the planet. It was a hypothesis so elegant, yet so counter-intuitive, that I literally could not put the book down.',
          'By the time I finished the last chapter, I realized that the values I had taken as objective truths were, in fact, historical constructs. That single insight completely changed the way I approach politics, economics, and even my own career choices.',
          'It is not an exaggeration to say that reading "Sapiens" planted the seed of my decision to pursue a master\'s degree in sociology. Without that book, I doubt I would have the intellectual curiosity or the moral framework that guides my work today.',
          // Part 3：深度讨论（双层次论证 / 让步 + 反驳 / 展望未来）
          'Admittedly, the automation of the labor market will almost certainly displace millions of low-skilled workers in the coming decades, and this transition will create genuine hardship for communities that rely heavily on manufacturing and routine service jobs.',
          'That being said, I would argue that the long-term benefits outweigh the short-term costs. History suggests that technological revolutions ultimately create more jobs than they destroy, provided governments invest heavily in retraining programs and social safety nets to smooth the transition.',
          'What concerns me most is not technology itself, but our collective failure to distribute its gains fairly. If we allow the wealth created by automation to concentrate in the hands of a tiny minority, we risk undermining the social cohesion that modern democratic societies are built upon.',
          'In an ideal world, then, policymakers would adopt a three-pronged strategy: first, incentivize lifelong learning through tax credits and subsidies; second, strengthen progressive taxation to reduce inequality; and third, invest in public sectors such as healthcare and education that are inherently labor-intensive and difficult to automate completely.'
        ]
      }
    },
    // IELTS 级别元数据（多语言显示 + band 范围 + 图标色）
    ieltsLevelsMeta: [
      {
        key: 'ielts_4_5',
        band: '4.5 - 5.0',
        shortBand: '4.5-5.0',
        color: '#27ae60',
        targetScenario: 'Foundation: Survival English & Simple Opinions',
        zh: { name: '雅思基础级', desc: '生存英语 + Part1 简单问答，适合目标 5 分考生' },
        en: { name: 'IELTS Foundation', desc: 'Survival English & Part 1 Q&A. For target Band 5.0.' },
        ja: { name: 'IELTS基礎', desc: 'サバイバル英語＋Part1 簡単な受け答え。目標バンド5.0向け' },
        ko: { name: 'IELTS 기초', desc: '생존 영어 + Part1 기초 질문. 목표 밴드 5.0' },
        fr: { name: 'Niveau Fondation', desc: 'Anglais de survie + Partie 1. Cible band 5.0.' }
      },
      {
        key: 'ielts_5_5',
        band: '5.5 - 6.0',
        shortBand: '5.5-6.0',
        color: '#2980b9',
        targetScenario: 'Intermediate: Full Part 2 Cue Cards + Structured Discussion',
        zh: { name: '雅思进阶级', desc: 'Part 2 完整 Cue Card + Part 3 结构化讨论，适合冲 6 分' },
        en: { name: 'IELTS Intermediate', desc: 'Full Part 2 cue cards & structured Part 3. Target Band 6.0.' },
        ja: { name: 'IELTS中級', desc: 'Part2 cue card完全回答＋Part3構造化議論。バンド6.0目指せ' },
        ko: { name: 'IELTS 중급', desc: 'Part2 완전 답변 + Part3 구조적 토론. 목표 밴드 6.0' },
        fr: { name: 'Niveau Intermédiaire', desc: 'Partie 2 complète & Partie 3 structurée. Cible band 6.0.' }
      },
      {
        key: 'ielts_6_5',
        band: '6.5 - 7.0',
        shortBand: '6.5-7.0',
        color: '#8e44ad',
        targetScenario: 'Competent: Idiomatic Speech & Academic Discussion',
        zh: { name: '雅思高分级', desc: '地道搭配 + 话题词汇 + 让步/因果论证，适合冲 7 分' },
        en: { name: 'IELTS Competent', desc: 'Idiomatic language, topic vocab, concession & cause-effect. Target Band 7.0.' },
        ja: { name: 'IELTS上級', desc: 'イディオム＋トピック語彙＋譲歩/因果論述。バンド7.0目指せ' },
        ko: { name: 'IELTS 고급', desc: '숙어 + 주제 어휘 + 양보/인과 논증. 목표 밴드 7.0' },
        fr: { name: 'Niveau Compétent', desc: 'Langage idiomatique, concessions & cause-effet. Cible band 7.0.' }
      },
      {
        key: 'ielts_7_5',
        band: '7.5+',
        shortBand: '7.5+',
        color: '#c0392b',
        targetScenario: 'Advanced: Abstract Topics, Rhetoric, Nuanced Position',
        zh: { name: '雅思冲刺级', desc: '抽象话题 + 修辞句式 + 双层次论证，适合冲 7.5+ 高分' },
        en: { name: 'IELTS Advanced', desc: 'Abstract topics, rhetoric, two-layer arguments. Target Band 7.5+.' },
        ja: { name: 'IELTS最上級', desc: '抽象トピック＋修辞法＋二段階論証。バンド7.5+目指せ' },
        ko: { name: 'IELTS 최상급', desc: '추상 주제 + 수사법 + 이중 논증. 목표 밴드 7.5+' },
        fr: { name: 'Niveau Avancé', desc: 'Sujets abstraits, rhétorique & arguments à deux niveaux. Cible band 7.5+.' }
      }
    ],
    // 用户自定义句子缓存（上传页→朗读页跳转用）
    customSentences: null,
    customLang: 'en'
  }
});
