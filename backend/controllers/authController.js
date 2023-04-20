const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

let refreshTokens = [];

const authController = {
  // Register
  registerUser: async (req, res) => {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(req.body.password, salt);

      // Create new user
      const newUser = await new User({
        username: req.body.username,
        email: req.body.email,
        password: hashed,
      });

      // Save to database
      const user = await newUser.save();
      return res.status(200).json(user);
    } catch (err) {
      return res.status(500).json(err);
    }
  },

  // Generate access token
  genetateAccessToken: (user) => {
    return jwt.sign(
      {
        id: user.id,
        admin: user.admin,
      },
      process.env.JWT_ACCESS_KEY,
      { expiresIn: "30s" }
    );
  },

  // Generate refresh token
  genetateRefreshToken: (user) => {
    return jwt.sign(
      {
        id: user.id,
        admin: user.admin,
      },
      process.env.JWT_REFRESH_KEY,
      { expiresIn: "365d" }
    );
  },

  // Login
  loginUser: async (req, res) => {
    try {
      const user = await User.findOne({
        username: req.body.username,
      });
      if (!user) {
        return res.status(404).json("User not found");
      }
      const validPassword = await bcrypt.compare(
        req.body.password,
        user.password
      );
      if (!validPassword) {
        return res.status(404).json("Invalid password");
      }
      if (user && validPassword) {
        const accessToken = authController.genetateAccessToken(user);
        const refreshToken = authController.genetateRefreshToken(user);
        refreshTokens.push(refreshToken);
        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: false,
          path: "/",
          sameSite: "strict",
        });
        const { password, ...others } = user._doc;
        return res.status(200).json({ ...others, accessToken });
      }
    } catch (err) {
      return res.status(500).json(err);
    }
  },

  // Refresh token
  requestRefreshToken: async (req, res) => {
    // Take refresh token from user
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json("You're not authenticated");
    }
    if (!refreshTokens.includes(refreshToken)) {
      return res.status(403).json("Refresh token is not valid");
    }
    jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY, (err, user) => {
      if (err) {
        console.log(err);
      }
      refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
      // Create new access token, refresh token
      const newAccessToken = authController.genetateAccessToken(user);
      const newRefreshToken = authController.genetateRefreshToken(user);
      refreshTokens.push(newRefreshToken);
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: false,
        path: "/",
        sameSite: "strict",
      });
      return res.status(200).json({ accessToken: newAccessToken });
    });
  },

  // Logout
  userLogout: async (req, res) => {
    res.clearCookie("refreshToken");
    refreshTokens = refreshTokens.filter(
      (token) => token !== req.cookies.refreshToken
    );
    return res.status(200).json("Logged out success");
  },
};

// Store token
/* 
    1. Local storage:
    XSS
    2. Httponly Cookie:
    CSRF -> samesite
    3.  redux store -> access token
        httponly cookie -> refresh token

    BFF Pattern (Backend for frontend)
*/

module.exports = authController;
