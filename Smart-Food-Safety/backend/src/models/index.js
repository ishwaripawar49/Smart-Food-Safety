const User = require("./User");
const Complaint = require("./Complaint");
const ComplaintImage = require("./ComplaintImage");
const AuthorityAction = require("./AuthorityAction");
const InvestigationHistory = require("./InvestigationHistory");
const Notification = require("./Notification");
const Shop = require("./Shop");
const AdulterationTest = require("./AdulterationTest");
const ComplaintSimilarityReview = require("./ComplaintSimilarityReview");


// ==========================================
// USER → COMPLAINTS
// ==========================================

User.hasMany(Complaint, {
  foreignKey: "user_id",
  as: "complaints"
});

Complaint.belongsTo(User, {
  foreignKey: "user_id",
  as: "user"
});

// ==========================================
// USER → NOTIFICATIONS
// ==========================================

User.hasMany(Notification, {
  foreignKey: "user_id",
  as: "notifications"
});

Notification.belongsTo(User, {
  foreignKey: "user_id",
  as: "user"
});

// ==========================================
// USER (AUTHORITY) → AUTHORITY ACTIONS
// ==========================================

User.hasMany(AuthorityAction, {
  foreignKey: "authority_id",
  as: "authorityActions"
});

AuthorityAction.belongsTo(User, {
  foreignKey: "authority_id",
  as: "authorityUser"
});

// ==========================================
// USER (AUTHORITY) → INVESTIGATION HISTORY
// ==========================================

User.hasMany(InvestigationHistory, {
  foreignKey: "authority_id",
  as: "investigationHistory"
});

InvestigationHistory.belongsTo(User, {
  foreignKey: "authority_id",
  as: "authorityUser"
});

// ==========================================
// SHOP → COMPLAINTS
// ==========================================

Shop.hasMany(Complaint, {
  foreignKey: "shop_id",
  as: "complaints"
});

Complaint.belongsTo(Shop, {
  foreignKey: "shop_id",
  as: "shop"
});

// ==========================================
// COMPLAINT → COMPLAINT IMAGE
// ==========================================

Complaint.hasMany(ComplaintImage, {
  foreignKey: "complaint_id",
  as: "images"
});

ComplaintImage.belongsTo(Complaint, {
  foreignKey: "complaint_id"
});

// ==========================================
// COMPLAINT → AUTHORITY ACTIONS
// ==========================================

Complaint.hasMany(AuthorityAction, {
  foreignKey: "complaint_id",
  as: "authorityActions"
});

AuthorityAction.belongsTo(Complaint, {
  foreignKey: "complaint_id"
});

// ==========================================
// COMPLAINT → INVESTIGATION HISTORY
// ==========================================

Complaint.hasMany(InvestigationHistory, {
  foreignKey: "complaint_id",
  as: "investigationHistory"
});

InvestigationHistory.belongsTo(Complaint, {
  foreignKey: "complaint_id"
});

// ==========================================
// COMPLAINT → NOTIFICATIONS
// ==========================================

Complaint.hasMany(Notification, {
  foreignKey: "complaint_id",
  as: "notifications"
});

Notification.belongsTo(Complaint, {
  foreignKey: "complaint_id"
});

// ==========================================
// COMPLAINT → ADULTERATION TESTS
// ==========================================

Complaint.hasMany(AdulterationTest, {
  foreignKey: "complaint_id",
  as: "adulterationTests"
});

AdulterationTest.belongsTo(Complaint, {
  foreignKey: "complaint_id",
  as: "complaint"
});

// ==========================================
// COMPLAINT SIMILARITY REVIEWS (PHASE 5)
// ==========================================

ComplaintSimilarityReview.belongsTo(Complaint, {
  foreignKey: "source_complaint_id",
  as: "source_complaint"
});

ComplaintSimilarityReview.belongsTo(Complaint, {
  foreignKey: "target_complaint_id",
  as: "target_complaint"
});

ComplaintSimilarityReview.belongsTo(User, {
  foreignKey: "reviewed_by",
  as: "reviewer"
});

Complaint.hasMany(ComplaintSimilarityReview, {
  foreignKey: "source_complaint_id",
  as: "sourceSimilarityReviews"
});

Complaint.hasMany(ComplaintSimilarityReview, {
  foreignKey: "target_complaint_id",
  as: "targetSimilarityReviews"
});

// ==========================================
// EXPORT ALL MODELS
// ==========================================

module.exports = {
  User,
  Complaint,
  ComplaintImage,
  AuthorityAction,
  InvestigationHistory,
  Notification,
  Shop,
  AdulterationTest,
  ComplaintSimilarityReview
};