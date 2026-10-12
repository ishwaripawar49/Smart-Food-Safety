const { Notification } = require("../models");

const createComplaintNotification = async ({
  userId,
  complaintId,
  complaintNumber,
  status,
}) => {
  if (!userId || !complaintId || !status) {
    return;
  }

  const notificationDetails = {
    UNDER_REVIEW: {
      title: "Complaint Under Review",
      message: `${complaintNumber} is now under review by the Food Safety Admin.`,
    },

    VERIFIED: {
      title: "Complaint Verified",
      message: `${complaintNumber} has been verified and referred for further action.`,
    },

    INVESTIGATION: {
      title: "Investigation Started",
      message: `Investigation has started for complaint ${complaintNumber}.`,
    },

    RESOLVED: {
      title: "Complaint Resolved",
      message: `Your complaint ${complaintNumber} has been resolved.`,
    },

    REJECTED: {
      title: "Complaint Rejected",
      message: `Your complaint ${complaintNumber} has been rejected.`,
    },

    SUBMITTED: {
      title: "Complaint Submitted",
      message: `Your complaint ${complaintNumber} has been submitted successfully.`,
    },
  };

  const details = notificationDetails[status];

  if (!details) {
    return;
  }

  await Notification.create({
    user_id: userId,
    complaint_id: complaintId,
    recipient_role: "CUSTOMER",
    title: details.title,
    message: details.message,
    notification_type: "STATUS_UPDATE",
    is_read: false,
  });
};

module.exports = {
  createComplaintNotification,
};