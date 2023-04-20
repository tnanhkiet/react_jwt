const User = require("../models/User");

const userController = {
  // Get all users
  getAllUsers: async (req, res) => {
    try {
      const user = await User.find();
      return res.status(200).json(user);
    } catch (err) {
      return res.status(500).json(err);
    }
  },

  // Delete user
  deleteUser: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      return res.status(200).json("User deleted");
    } catch (err) {
      return res.status(500).json(err);
    }
  },
};

module.exports = userController;
