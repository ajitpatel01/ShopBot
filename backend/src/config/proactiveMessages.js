/**
 * Proactive message templates for scheduled customer outreach.
 * Like Zomato/Swiggy push notifications but via WhatsApp.
 */

module.exports = {
  MORNING_TEMPLATES: [
    "Good morning {name}! ☀️ Hope you're having a great day. {shopName} is now open! Check out today's specials 😊",
    "Subah ki shubhkamnayen! 🌅 {shopName} is open and ready to serve you. What can we get you today?",
    "Good morning! ☀️ Starting the day right at {shopName}. Fresh and ready for you 🙏",
  ],

  EVENING_TEMPLATES: [
    "Good evening! 🌙 Evening snack time at {shopName}? We're open till {closeTime} tonight 😊",
    "Hey {name}! 🍵 It's that time of the day — {shopName} has got your evening covered. What would you like?",
    "Shaam ho gayi! 🌅 {shopName} mein aaj kya loge? We're here till {closeTime} 😊",
  ],

  REENGAGEMENT_TEMPLATES: [
    "Hey {name}! 😊 We miss you at {shopName}! It's been a while. Come back and say hi 🙏",
    "Long time no see! 👋 {shopName} has some new items you might love. Want to check them out?",
    "Hi {name}! 🌟 {shopName} yahan hai, bas aapka intezaar kar raha tha 😄 What can we get you?",
  ],

  FESTIVAL_TEMPLATES: [
    "{festivalGreeting} {festivalEmoji} from {shopName}! Celebrate with us — special festive offers available today 🎉",
    "{festivalGreeting} {festivalEmoji} {name}! Wishing you and your family a wonderful {festivalName}. {shopName} is open to serve you 🙏",
  ],

  formatMessage(template, vars) {
    return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] || match);
  },

  getRandomTemplate(templates) {
    return templates[Math.floor(Math.random() * templates.length)];
  }
};
