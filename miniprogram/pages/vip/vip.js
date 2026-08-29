// pages/vip/vip.js - 会员中心：套餐展示 + 激活码兑换 + 微信虚拟支付 + mock开通

const app = getApp();
const i18n = require('../../utils/i18n.js');
const api = require('../../utils/api.js');
const CONFIG = require('../../config.js');

const TEXT_MAP = {
  zh: {
    vip_hero_title: '升级 LinguaSpeak Pro',
    vip_hero_sub: '解锁全部多语言朗读训练，AI精准评分',
    vip_forever_active: '永久会员',
    vip_days_left_prefix: '剩余',
    vip_days_left_suffix: '天',
    vip_forever_desc: '不限时长，永久使用',
    vip_plan_2year: '两年期会员',
    vip_trial_tag: '免费试用',
    vip_trial_remain_prefix: '还剩 ',
    vip_trial_remain_suffix: '',
    vip_trial_desc: '60分钟完整功能免费体验，请在结束前开通Pro',
    vip_expired_tag: '免费已结束',
    vip_expired_text: '升级后立即解锁所有功能',
    vip_expired_desc: '支持微信支付一键开通 & 激活码兑换两种方式',
    vip_section_plan: '选择套餐',
    vip_plan_2year_name: 'Pro · 两年',
    vip_plan_forever_name: 'Pro · 不限时',
    vip_plan_2year_desc: '共24个月，性价比之选',
    vip_plan_forever_desc: '一次购买，终身可用，未来更新全免费',
    vip_badge_popular: '人气',
    vip_badge_best: '超值',
    vip_section_feature: 'Pro 会员权益',
    vip_feat_1_name: '无限录音训练', vip_feat_1_desc: '每天不限时长不限次数',
    vip_feat_2_name: 'AI精准评分',   vip_feat_2_desc: '同声传译+编辑距离算法',
    vip_feat_3_name: '5国语言',      vip_feat_3_desc: '中/英/日/韩/法 全部解锁',
    vip_feat_4_name: '自定义内容',   vip_feat_4_desc: '上传任意文本/TXT做训练',
    vip_feat_5_name: '云端同步',     vip_feat_5_desc: '多设备进度/录音/历史互通',
    vip_feat_6_name: '动态课程',     vip_feat_6_desc: '运营课表持续更新中',
    vip_section_code: '激活码兑换',
    vip_code_hint: '(已有激活码？从这里兑换)',
    vip_code_ph: '如 LS-PRO-XXXX-XXXX-XXXX',
    vip_code_btn: '立即兑换',
    vip_code_ing: '兑换中...',
    vip_code_tip: '支持通过淘宝/经销商/客服等渠道获取激活码，个人小程序无法开通微信支付时仍可使用本通道。',
    vip_buy_ing: '处理中...',
    vip_btn_renew: '续费 / 延长',
    vip_btn_buy_2year: '¥49.8 开通两年',
    vip_btn_buy_forever: '¥99 永久开通',
    vip_pay_disabled: '当前未开启微信支付',
    vip_use_code_only: '请使用上方【激活码兑换】方式开通（个人小程序不支持虚拟支付）',
    redeem_success_forever: '🎉 已成功激活不限时Pro会员！',
    redeem_success_2year: '🎉 已激活两年Pro会员！',
    redeem_fail: '激活失败',
    pay_success_forever: '🎉 恭喜！永久会员已开通',
    pay_success_2year: '🎉 恭喜！两年会员已开通',
    pay_fail: '支付未完成',
    free_gone_title: '免费体验已结束',
    free_gone_confirm: '立即开通',
    code_required: '请输入激活码',
    plan_unsupported: '该套餐暂时无法购买',
    env_disabled_pay: '云环境未配置，无法下单。请先配置 CLOUD_ENV 或使用激活码。'
  },
  en: {
    vip_hero_title: 'Upgrade to LinguaSpeak Pro',
    vip_hero_sub: 'Unlock all languages & AI-powered pronunciation feedback',
    vip_forever_active: 'Lifetime Pro',
    vip_days_left_prefix: '', vip_days_left_suffix: ' days left',
    vip_forever_desc: 'Unlimited, forever valid',
    vip_plan_2year: '2-Year Membership',
    vip_trial_tag: 'Free Trial', vip_trial_remain_prefix: '', vip_trial_remain_suffix: ' left',
    vip_trial_desc: 'Enjoy 60 minutes of full features. Upgrade to keep going!',
    vip_expired_tag: 'Trial Ended', vip_expired_text: 'Upgrade now to unlock everything',
    vip_expired_desc: 'Two easy ways: WeChat Pay or activation code',
    vip_section_plan: 'Choose a Plan',
    vip_plan_2year_name: 'Pro · 2 Years',
    vip_plan_forever_name: 'Pro · Lifetime',
    vip_plan_2year_desc: '24 months — best value for learners',
    vip_plan_forever_desc: 'One-time purchase, lifetime access & updates',
    vip_badge_popular: 'Popular', vip_badge_best: 'Best Deal',
    vip_section_feature: 'What\'s Included',
    vip_feat_1_name: 'Unlimited Recording', vip_feat_1_desc: 'All day, every day',
    vip_feat_2_name: 'AI Scoring',       vip_feat_2_desc: 'ASR + Levenshtein based',
    vip_feat_3_name: '5 Languages',      vip_feat_3_desc: 'CN/EN/JP/KO/FR unlocked',
    vip_feat_4_name: 'Custom Content',   vip_feat_4_desc: 'Paste any text or .txt',
    vip_feat_5_name: 'Cloud Sync',       vip_feat_5_desc: 'Multi-device progress',
    vip_feat_6_name: 'Dynamic Courses',  vip_feat_6_desc: 'Fresh content weekly',
    vip_section_code: 'Have an Activation Code?',
    vip_code_hint: '(Redeem from partner channels)',
    vip_code_ph: 'e.g. LS-PRO-XXXX-XXXX-XXXX',
    vip_code_btn: 'Redeem', vip_code_ing: 'Redeeming...',
    vip_code_tip: 'Get codes from TaoBao / resellers / customer support. Works even on personal mini-program accounts!',
    vip_buy_ing: 'Processing...',
    vip_btn_renew: 'Extend / Renew',
    vip_btn_buy_2year: 'Buy 2 Years ¥49.8',
    vip_btn_buy_forever: 'Get Lifetime ¥99',
    vip_pay_disabled: 'WeChat Pay unavailable',
    vip_use_code_only: 'Please use Activation Code above (personal accounts do not support virtual payment)',
    redeem_success_forever: '🎉 Lifetime Pro activated!',
    redeem_success_2year: '🎉 2-Year Pro activated!',
    redeem_fail: 'Redeem failed',
    pay_success_forever: '🎉 Congratulations! Lifetime Pro is active.',
    pay_success_2year: '🎉 Congratulations! 2-Year Pro is active.',
    pay_fail: 'Payment not completed',
    code_required: 'Please enter an activation code',
    plan_unsupported: 'This plan is unavailable right now',
    env_disabled_pay: 'Cloud ENV is not configured yet. Please configure CLOUD_ENV or use an activation code.'
  },
  ja: {
    vip_hero_title: 'LinguaSpeak Proにアップグレード',
    vip_hero_sub: '全言語+AI発音フィードバックを解放',
    vip_forever_active: '永久Pro', vip_days_left_prefix: 'あと ', vip_days_left_suffix: '日',
    vip_forever_desc: '期間制限なし、永久に使えます',
    vip_plan_2year: '2年間プラン',
    vip_trial_tag: '無料体験中', vip_trial_remain_prefix: 'あと ', vip_trial_remain_suffix: '',
    vip_trial_desc: '60分間は全機能無料。終わったらProへアップグレード！',
    vip_expired_tag: '体験終了', vip_expired_text: 'Proにアップグレードして続けましょう',
    vip_expired_desc: '微信決済 または アクティベーションコード の2Way',
    vip_section_plan: 'プラン選択',
    vip_plan_2year_name: 'Pro・2年', vip_plan_forever_name: 'Pro・永久',
    vip_plan_2year_desc: '24ヶ月、学習者に最適',
    vip_plan_forever_desc: '買い切り、永久+アップデート込み',
    vip_badge_popular: '人気', vip_badge_best: 'お得',
    vip_section_feature: 'Pro特典',
    vip_feat_1_name: '録音無制限', vip_feat_1_desc: '毎日何時間でも',
    vip_feat_2_name: 'AI採点',       vip_feat_2_desc: 'ASR+編集距離アルゴリズム',
    vip_feat_3_name: '5言語対応',   vip_feat_3_desc: '中/英/日/韓/仏 解放',
    vip_feat_4_name: 'カスタム教材', vip_feat_4_desc: '自由な文章/TXTを読み上げ',
    vip_feat_5_name: 'クラウド同期', vip_feat_5_desc: '複数端末で進捗共有',
    vip_feat_6_name: '動的コース',   vip_feat_6_desc: '随時コンテンツ更新',
    vip_section_code: 'アクティベーションコード',
    vip_code_hint: '（お持ちの方はこちらから）',
    vip_code_ph: '例：LS-PRO-XXXX-XXXX-XXXX',
    vip_code_btn: '交換する', vip_code_ing: '交換中...',
    vip_code_tip: '淘宝/代理店/カスタマサポート等で入手可能。個人アカウントでもご利用いただけます。',
    vip_buy_ing: '処理中...',
    vip_btn_renew: '更新 / 延長',
    vip_btn_buy_2year: '¥49.8 2年契約',
    vip_btn_buy_forever: '¥99 永久会員',
    vip_pay_disabled: '微信決済は現在利用できません',
    vip_use_code_only: '上のアクティベーションコードをご利用ください（個人アカウントは微信決済非対応）',
    redeem_success_forever: '🎉 永久Pro が有効になりました！',
    redeem_success_2year: '🎉 2年間Pro が有効になりました！',
    redeem_fail: '交換に失敗しました',
    pay_success_forever: '🎉 おめでとうございます！永久Pro 会員になりました',
    pay_success_2year: '🎉 おめでとうございます！2年Pro 会員になりました',
    pay_fail: '支払いは完了していません',
    code_required: 'アクティベーションコードを入力してください',
    plan_unsupported: 'このプランは現在購入できません',
    env_disabled_pay: 'クラウド環境未設定。CLOUD_ENV を設定するか、アクティベーションコードをご利用ください。'
  },
  ko: {
    vip_hero_title: 'LinguaSpeak Pro로 업그레이드',
    vip_hero_sub: '전 언어 + AI 발음 피드백 해제',
    vip_forever_active: '평생 Pro', vip_days_left_prefix: '', vip_days_left_suffix: '일 남음',
    vip_forever_desc: '기간 제한 없이 평생 사용',
    vip_plan_2year: '2년 플랜',
    vip_trial_tag: '무료 체험', vip_trial_remain_prefix: '', vip_trial_remain_suffix: ' 남음',
    vip_trial_desc: '60분간 모든 기능 무료. 끝나면 Pro로 업그레이드하세요!',
    vip_expired_tag: '체험 종료', vip_expired_text: '업그레이드 후 모든 기능 잠금해제',
    vip_expired_desc: '위챗페이 또는 액티베이션 코드 중 선택',
    vip_section_plan: '플랜 선택',
    vip_plan_2year_name: 'Pro · 2년', vip_plan_forever_name: 'Pro · 평생',
    vip_plan_2year_desc: '24개월 · 학습자 최고 선택',
    vip_plan_forever_desc: '일회성 구매 · 평생+업데이트 포함',
    vip_badge_popular: '인기', vip_badge_best: '특가',
    vip_section_feature: 'Pro 혜택',
    vip_feat_1_name: '무제한 녹음', vip_feat_1_desc: '언제나 어디서나',
    vip_feat_2_name: 'AI 채점',    vip_feat_2_desc: 'ASR + 레벤슈타인 기반',
    vip_feat_3_name: '5개 언어',   vip_feat_3_desc: '중/영/일/한/불',
    vip_feat_4_name: '커스텀 교재', vip_feat_4_desc: '텍스트/TXT 자유롭게',
    vip_feat_5_name: '클라우드 동기', vip_feat_5_desc: '다기기 진도 공유',
    vip_feat_6_name: '동적 코스',  vip_feat_6_desc: '매주 신규 콘텐츠',
    vip_section_code: '액티베이션 코드가 있나요?',
    vip_code_hint: '(파트너 채널에서 구매 가능)',
    vip_code_ph: '예: LS-PRO-XXXX-XXXX-XXXX',
    vip_code_btn: '교환하기', vip_code_ing: '교환 중...',
    vip_code_tip: '타오바오/대리점/CS에서 구할 수 있습니다. 개인 소계정도 사용 가능.',
    vip_buy_ing: '처리 중...',
    vip_btn_renew: '갱신 / 연장',
    vip_btn_buy_2year: '¥49.8 2년 결제',
    vip_btn_buy_forever: '¥99 평생 회원',
    vip_pay_disabled: '위챗페이 사용 불가',
    vip_use_code_only: '위의 액티베이션 코드를 이용해 주세요 (개인 소계정은 가상결제 비지원)',
    redeem_success_forever: '🎉 평생 Pro가 활성화되었습니다!',
    redeem_success_2year: '🎉 2년 Pro가 활성화되었습니다!',
    redeem_fail: '교환 실패',
    pay_success_forever: '🎉 축하합니다! 평생 Pro 회원이 되셨습니다',
    pay_success_2year: '🎉 축하합니다! 2년 Pro 회원이 되셨습니다',
    pay_fail: '결제가 완료되지 않았습니다',
    code_required: '액티베이션 코드를 입력해 주세요',
    plan_unsupported: '이 플랜은 지금 구매할 수 없습니다',
    env_disabled_pay: '클라우드 ENV 미설정. CLOUD_ENV를 설정하거나 액티베이션 코드를 이용하세요.'
  },
  fr: {
    vip_hero_title: 'Passez à LinguaSpeak Pro',
    vip_hero_sub: 'Débloquez toutes les langues et les notes IA',
    vip_forever_active: 'Pro à vie', vip_days_left_prefix: '', vip_days_left_suffix: ' jours restants',
    vip_forever_desc: 'Illimité, valable pour toujours',
    vip_plan_2year: 'Abonnement 2 ans',
    vip_trial_tag: 'Essai gratuit', vip_trial_remain_prefix: '', vip_trial_remain_suffix: ' restant',
    vip_trial_desc: '60 minutes gratuites. Passez à Pro pour continuer !',
    vip_expired_tag: 'Essai terminé', vip_expired_text: 'Passez à Pro pour tout débloquer',
    vip_expired_desc: 'Deux options : WeChat Pay ou code d\'activation',
    vip_section_plan: 'Choisir un abonnement',
    vip_plan_2year_name: 'Pro · 2 ans', vip_plan_forever_name: 'Pro · à vie',
    vip_plan_2year_desc: '24 mois — le meilleur rapport qualité/prix',
    vip_plan_forever_desc: 'Achat unique, accès à vie + mises à jour',
    vip_badge_popular: 'Populaire', vip_badge_best: 'Le top',
    vip_section_feature: 'Avantages Pro',
    vip_feat_1_name: 'Enregistrement illimité', vip_feat_1_desc: 'Toute la journée, tous les jours',
    vip_feat_2_name: 'Notation IA',        vip_feat_2_desc: 'ASR + distance de Levenshtein',
    vip_feat_3_name: '5 langues',         vip_feat_3_desc: 'CN/EN/JP/KO/FR débloqués',
    vip_feat_4_name: 'Contenu personnalisé', vip_feat_4_desc: 'Collez texte ou .txt',
    vip_feat_5_name: 'Sync cloud',        vip_feat_5_desc: 'Progression multi-appareils',
    vip_feat_6_name: 'Cours dynamiques',  vip_feat_6_desc: 'Contenu mis à jour chaque semaine',
    vip_section_code: 'Code d\'activation ?',
    vip_code_hint: '(acheté auprès de nos partenaires)',
    vip_code_ph: 'Ex : LS-PRO-XXXX-XXXX-XXXX',
    vip_code_btn: 'Activer', vip_code_ing: 'Activation...',
    vip_code_tip: 'Codes disponibles sur TaoBao / revendeurs / support. Compatible avec les comptes personnels.',
    vip_buy_ing: 'Traitement...',
    vip_btn_renew: 'Renouveler / Prolonger',
    vip_btn_buy_2year: 'Prendre 2 ans ¥49.8',
    vip_btn_buy_forever: 'À vie ¥99',
    vip_pay_disabled: 'WeChat Pay indisponible',
    vip_use_code_only: 'Utilisez un code d\'activation (comptes personnels : pas de paiement virtuel)',
    redeem_success_forever: '🎉 Pro à vie activé !',
    redeem_success_2year: '🎉 Pro 2 ans activé !',
    redeem_fail: 'Échec de l\'activation',
    pay_success_forever: '🎉 Félicitations ! Pro à vie actif.',
    pay_success_2year: '🎉 Félicitations ! Pro 2 ans actif.',
    pay_fail: 'Paiement non finalisé',
    code_required: 'Veuillez saisir un code d\'activation',
    plan_unsupported: 'Cette offre est indisponible pour le moment',
    env_disabled_pay: 'Environnement cloud non configuré. Configurez CLOUD_ENV ou utilisez un code d\'activation.'
  }
};

Page({
  data: {
    locale: {},
    statusReady: false,
    // 免费/会员状态
    freeTrial: { active: false, remainingMinutes: 0, remainingSeconds: 0 },
    vip: { active: false, planKey: null, isForever: false, daysLeft: 0 },
    freeTrialRemainingSecText: '00',
    // 套餐
    plans: [],
    selectedPlan: 'pro_forever',
    // 激活码
    activationInput: '',
    redeeming: false,
    // 支付
    enableWxPay: true,
    paying: false,
    // mock
    showMockBtn: false
  },

  _countdownTimer: null,

  onLoad: function () {
    const lang = i18n.getLang();
    const locale = (TEXT_MAP[lang] || TEXT_MAP.en);

    // 套餐文案
    const plansCfg = CONFIG.VIP && CONFIG.VIP.PLANS ? CONFIG.VIP.PLANS : [];
    const plans = plansCfg.map(p => ({
      planKey: p.planKey,
      price: p.price,
      nameText: locale[p.nameI18nKey] || p.planKey,
      priceAmountText: p.priceLabel || ('¥' + (p.price / 100).toFixed(p.price % 100 === 0 ? 0 : 1).replace(/\.0$/, '')),
      descText: locale[p.descI18nKey] || p.descI18nKey || '',
      badgeText: locale[p.badgeI18nKey] || ''
    }));
    if (plans.length === 0) {
      plans.push(
        { planKey: 'pro_2year', price: 4980, nameText: locale.vip_plan_2year_name, priceAmountText: '¥49.8', descText: locale.vip_plan_2year_desc, badgeText: locale.vip_badge_popular },
        { planKey: 'pro_forever', price: 9900, nameText: locale.vip_plan_forever_name, priceAmountText: '¥99', descText: locale.vip_plan_forever_desc, badgeText: locale.vip_badge_best }
      );
    }

    const enableWxPay = !!(CONFIG.FEATURES && CONFIG.FEATURES.ENABLE_WX_PAY)
      && !!(CONFIG.isCloudConfigured && CONFIG.isCloudConfigured());

    this.setData({
      locale: locale,
      plans: plans,
      selectedPlan: plans.find(p => p.planKey === 'pro_forever') ? 'pro_forever' : (plans[0] && plans[0].planKey || ''),
      enableWxPay: enableWxPay,
      showMockBtn: !CONFIG.isCloudConfigured() || (typeof __wxConfig !== 'undefined' && __wxConfig.envVersion !== 'release')
    });
    wx.setNavigationBarTitle({ title: locale.vip_hero_title || 'Pro' });
    this.refreshVipStatus(true);
  },

  onUnload: function () {
    if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; }
  },

  refreshVipStatus: function (startCountdown) {
    const that = this;
    app.refreshVipStatus().then((st) => {
      const s = st || {};
      const freeTrial = Object.assign({ active: false, remainingMinutes: 0, remainingSeconds: 0 }, s.freeTrial || {});
      const vip = Object.assign({ active: false, planKey: null, isForever: false, daysLeft: 0 }, s.vip || {});
      that.setData({
        statusReady: true,
        freeTrial: freeTrial,
        vip: vip,
        freeTrialRemainingSecText: String(freeTrial.remainingSeconds || 0).padStart(2, '0')
      });
      if (startCountdown && freeTrial.active) {
        that.startCountdown();
      }
    });
  },

  startCountdown: function () {
    if (this._countdownTimer) return;
    const that = this;
    this._countdownTimer = setInterval(() => {
      const t = that.data.freeTrial;
      if (!t || !t.active) { clearInterval(that._countdownTimer); that._countdownTimer = null; return; }
      let sec = Number(t.remainingSeconds) - 1;
      let min = Number(t.remainingMinutes);
      if (sec < 0) { sec = 59; min -= 1; }
      if (min < 0) {
        clearInterval(that._countdownTimer); that._countdownTimer = null;
        that.refreshVipStatus(false);
        return;
      }
      that.setData({
        'freeTrial.remainingMinutes': min,
        'freeTrial.remainingSeconds': sec,
        freeTrialRemainingSecText: String(sec).padStart(2, '0')
      });
    }, 1000);
  },

  // ========== 套餐选择 ==========
  onSelectPlan: function (e) {
    const key = e.currentTarget.dataset.plan;
    if (!key) return;
    this.setData({ selectedPlan: key });
  },

  // ========== 激活码 ==========
  onCodeInput: function (e) { this.setData({ activationInput: (e.detail && e.detail.value) || '' }); },

  onRedeemCode: function () {
    const that = this;
    const code = (this.data.activationInput || '').toString().trim();
    const locale = this.data.locale;
    if (!code) { wx.showToast({ title: locale.code_required || '请输入激活码', icon: 'none' }); return; }
    this.setData({ redeeming: true });
    api.redeemActivationCode(code).then((res) => {
      that.setData({ redeeming: false });
      if (res && res.redeemed) {
        wx.showToast({ title: res.isForever ? locale.redeem_success_forever : locale.redeem_success_2year, icon: 'success', duration: 2600 });
        that.setData({ activationInput: '' });
        setTimeout(() => that.refreshVipStatus(true), 800);
      } else {
        wx.showToast({ title: (res && res.errorMsg) || (locale.redeem_fail || '激活失败'), icon: 'none', duration: 3000 });
      }
    }).catch(() => {
      that.setData({ redeeming: false });
      wx.showToast({ title: locale.redeem_fail || '激活失败', icon: 'none' });
    });
  },

  // ========== 购买（微信虚拟支付） ==========
  onBuy: function () {
    const that = this;
    const planKey = this.data.selectedPlan;
    const locale = this.data.locale;
    if (!planKey) { wx.showToast({ title: locale.plan_unsupported || '请选择套餐', icon: 'none' }); return; }
    if (!CONFIG.isCloudConfigured()) {
      wx.showToast({ title: locale.env_disabled_pay || '云环境未配置', icon: 'none', duration: 3500 });
      return;
    }
    this.setData({ paying: true });
    api.createVipOrder(planKey).then((res) => {
      if (!res || res.errorCode) {
        that.setData({ paying: false });
        const msg = (res && res.errorMsg) || (locale.pay_fail || '下单失败');
        const hint = (res && res.fallbackHint) || '';
        wx.showModal({ title: '提示', content: msg + (hint ? '\n\n' + hint : ''), showCancel: false });
        return;
      }

      const outTradeNo = res.outTradeNo;
      const payEnv = res.payEnv;

      // 拉起虚拟支付
      // 兼容两种 API：旧 wx.requestVirtualPayment 可能在基础库存在
      const payFn = wx.requestVirtualPayment || wx.requestPaymentVirtualGoods;
      if (!payFn) {
        that.setData({ paying: false });
        // 基础库不支持：直接走 verify 的兜底（在企业号上通常不会触发）
        wx.showModal({
          title: '无法拉起支付',
          content: '当前微信基础库不支持虚拟支付，您可以：\n\n1. 升级基础库到最新版\n2. 改用【激活码兑换】方式开通\n（如在开发工具中mock，点确认可直开通）',
          confirmText: '我有激活码',
          cancelText: 'Mock调试',
          cancelColor: '#95a5a6',
          success: (rr) => {
            if (!rr.confirm) that.onMock(planKey);
          }
        });
        return;
      }

      try {
        payFn({
          env: Number(payEnv) === 1 ? 1 : 0,
          offerId: '',   // 新版无需
          currencyType: 'CNY',
          outTradeNo: outTradeNo,
          // 新版字段名：out_trade_no（部分基础库版本二选一）
          out_trade_no: outTradeNo,
          success: () => {
            // 支付成功：验单 + 开通会员
            api.verifyVipOrder(outTradeNo).then((v) => {
              that.setData({ paying: false });
              if (v && v.vipGranted) {
                wx.showToast({
                  title: (v.planKey === 'pro_forever') ? locale.pay_success_forever : locale.pay_success_2year,
                  icon: 'success', duration: 2800
                });
                setTimeout(() => that.refreshVipStatus(true), 800);
              } else {
                wx.showModal({
                  title: '提示',
                  content: '微信已扣款，但会员开通遇到问题？\n请联系客服并提供订单号：' + outTradeNo,
                  showCancel: false
                });
              }
            }).catch(() => {
              that.setData({ paying: false });
              wx.showToast({ title: locale.pay_fail || '开通失败', icon: 'none' });
            });
          },
          fail: () => {
            that.setData({ paying: false });
            wx.showToast({ title: locale.pay_fail || '支付未完成', icon: 'none' });
          },
          complete: () => {}
        });
      } catch (e) {
        that.setData({ paying: false });
        console.warn('[vip] payFn ex:', e);
        wx.showToast({ title: locale.pay_fail || '支付失败', icon: 'none' });
      }
    }).catch(() => {
      that.setData({ paying: false });
      wx.showToast({ title: locale.pay_fail || '下单失败', icon: 'none' });
    });
  },

  // ========== Mock 调试按钮 ==========
  onMock2y: function () { this.onMock('pro_2year'); },
  onMockForever: function () { this.onMock('pro_forever'); },
  onMock: function (planKey) {
    const that = this;
    const locale = this.data.locale;
    api.mockOpenVip(planKey).then((res) => {
      if (res && res.vipGranted) {
        wx.showToast({ title: planKey === 'pro_forever' ? locale.pay_success_forever : locale.pay_success_2year, icon: 'success', duration: 2600 });
        setTimeout(() => that.refreshVipStatus(true), 800);
      } else {
        wx.showToast({ title: (res && res.errorMsg) || 'Mock被拒（线上已关）', icon: 'none' });
      }
    }).catch(() => wx.showToast({ title: 'Mock失败', icon: 'none' }));
  }
});
