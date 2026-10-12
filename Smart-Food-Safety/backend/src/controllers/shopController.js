const { Shop, Complaint } = require("../models");
const { Op } = require("sequelize");

// ==========================================
// GET ALL SHOPS (List & Search)
// ==========================================
const getAllShops = async (req, res) => {
  try {
    const { search, status } = req.query;
    const whereClause = {};

    if (status && status !== "ALL" && status !== "All") {
      whereClause.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereClause[Op.or] = [
        { shop_name: { [Op.like]: q } },
        { owner_name: { [Op.like]: q } },
        { city: { [Op.like]: q } },
        { license_number: { [Op.like]: q } },
      ];
    }

    const shops = await Shop.findAll({
      where: whereClause,
      order: [["created_at", "DESC"]],
    });

    // Enrich shops with real complaint counts
    const enrichedShops = await Promise.all(
      shops.map(async (shop) => {
        const complaintCount = await Complaint.count({
          where: { shop_id: shop.id },
        });

        // Determine risk level based on complaints and stored risk_score
        let risk = "Low";
        if (complaintCount >= 10 || shop.risk_score >= 75) {
          risk = "Critical";
        } else if (complaintCount >= 5 || shop.risk_score >= 50) {
          risk = "High";
        } else if (complaintCount >= 2 || shop.risk_score >= 25) {
          risk = "Medium";
        }

        return {
          ...shop.toJSON(),
          complaints: complaintCount,
          risk,
        };
      })
    );

    res.json({
      success: true,
      shops: enrichedShops,
    });
  } catch (error) {
    console.error("Get All Shops Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve shops.",
      error: error.message,
    });
  }
};

// ==========================================
// GET SINGLE SHOP BY ID
// ==========================================
const getShopById = async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await Shop.findByPk(id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    const complaints = await Complaint.findAll({
      where: { shop_id: shop.id },
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      shop: {
        ...shop.toJSON(),
        complaintCount: complaints.length,
        complaints,
      },
    });
  } catch (error) {
    console.error("Get Shop By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve shop details.",
      error: error.message,
    });
  }
};

// ==========================================
// CREATE NEW SHOP (Admin only)
// ==========================================
const createShop = async (req, res) => {
  try {
    const {
      shop_name,
      owner_name,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      license_number,
      status,
    } = req.body;

    if (!shop_name || !shop_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Shop name is required.",
      });
    }

    if (!license_number || !license_number.trim()) {
      return res.status(400).json({
        success: false,
        message: "FSSAI license number is required.",
      });
    }

    // Check if license number already registered
    const existing = await Shop.findOne({
      where: { license_number: license_number.trim() },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A business with this FSSAI license number is already registered.",
      });
    }

    const shop = await Shop.create({
      shop_name: shop_name.trim(),
      owner_name: owner_name?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      pincode: pincode?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      license_number: license_number.trim(),
      status: (status || "ACTIVE").toUpperCase(),
      risk_score: 0,
    });

    res.status(201).json({
      success: true,
      message: "Shop registered successfully.",
      shop,
    });
  } catch (error) {
    console.error("Create Shop Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create shop.",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE SHOP (Admin only)
// ==========================================
const updateShop = async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await Shop.findByPk(id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    const {
      shop_name,
      owner_name,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      license_number,
      status,
    } = req.body;

    await shop.update({
      shop_name: shop_name !== undefined ? shop_name.trim() : shop.shop_name,
      owner_name: owner_name !== undefined ? owner_name?.trim() : shop.owner_name,
      address: address !== undefined ? address?.trim() : shop.address,
      city: city !== undefined ? city?.trim() : shop.city,
      state: state !== undefined ? state?.trim() : shop.state,
      pincode: pincode !== undefined ? pincode?.trim() : shop.pincode,
      phone: phone !== undefined ? phone?.trim() : shop.phone,
      email: email !== undefined ? email?.trim() : shop.email,
      license_number: license_number !== undefined ? license_number.trim() : shop.license_number,
      status: status !== undefined ? status.toUpperCase() : shop.status,
    });

    res.json({
      success: true,
      message: "Shop updated successfully.",
      shop,
    });
  } catch (error) {
    console.error("Update Shop Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update shop.",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE / SUSPEND SHOP (Admin only)
// ==========================================
const deleteShop = async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await Shop.findByPk(id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    // Check if shop has complaints
    const linkedComplaints = await Complaint.count({
      where: { shop_id: shop.id },
    });

    if (linkedComplaints > 0) {
      // Safe deletion policy: Do not delete record if complaints reference it.
      // Instead, suspend the shop to preserve audit trails.
      await shop.update({ status: "SUSPENDED" });
      return res.json({
        success: true,
        message: `Shop has ${linkedComplaints} associated complaints. Shop status was set to SUSPENDED to maintain history integrity.`,
        shop,
      });
    }

    // No linked complaints -> can safely delete
    await shop.destroy();

    res.json({
      success: true,
      message: "Shop deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Shop Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete shop.",
      error: error.message,
    });
  }
};

module.exports = {
  getAllShops,
  getShopById,
  createShop,
  updateShop,
  deleteShop,
};
