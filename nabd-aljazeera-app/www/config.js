/*
 * إعدادات تطبيق نبض الجزيرة
 * SUPABASE_URL و SUPABASE_KEY: نفس القيم الموجودة في config.js الخاص بموقع الصحيفة
 * (المفتاح العام publishable/anon فقط – لا تضع مفتاح service_role هنا أبداً)
 * SITE_URL: رابط موقع الصحيفة لروابط المشاركة، مثل "https://nabd-aljazeera.vercel.app"
 * إذا تُرك SUPABASE_URL فارغاً يعرض التطبيق محتوى تجريبياً.
 */
window.NABD_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_KEY: "",
  SITE_URL: "",
  POSTS_PER_PAGE: 20,
  CONTACT_EMAIL: "",
  CONTACT_WHATSAPP: "",
  PRIVACY_URL: "",
  FACEBOOK_URL: "",
  APP_VERSION: "1.0.0"
};
