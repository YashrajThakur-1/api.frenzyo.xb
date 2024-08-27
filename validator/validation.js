const Joi = require("joi");
const registrationSchema = Joi.object({
  name: Joi.string().required().messages({
    "string.base": "Name should be a string",
    "string.empty": "Name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email",
    "string.empty": "Email is required",
  }),
  phone_number: Joi.string().length(10).pattern(/^\d+$/).required().messages({
    "string.pattern.base": "Please provide a valid phone number",
    "string.length": "Phone number should be exactly 10 digits",
    "string.empty": "Phone number is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "string.empty": "Password is required",
  }),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Confirm Password does not match",
    "string.empty": "Confirm Password is required",
  }),
  bio: Joi.string().optional(),
  googleId: Joi.string().optional(),
  facebookId: Joi.string().optional(),
  appleId: Joi.string().optional(),
});

// Validation middleware
const validateRegistration = (req, res, next) => {
  const { error } = registrationSchema.validate(req.body);
  if (error) {
    console.log(error);
    return res
      .status(400)
      .json({ errors: error.details.map((err) => err.message) });
  }
  next();
};

// Define schemas for login, forgot-password, and reset-password similarly
const loginSchema = Joi.object({
  identifier: Joi.string().required().messages({
    "string.empty": "Identifier (email or phone number) is required",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
});

const validateLogin = (req, res, next) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    console.log(error);

    return res
      .status(400)
      .json({ errors: error.details.map((err) => err.message) });
  }
  next();
};

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email",
    "string.empty": "Email is required",
  }),
});

const validateForgotPassword = (req, res, next) => {
  const { error } = forgotPasswordSchema.validate(req.body);
  if (error) {
    console.log(error);

    return res
      .status(400)
      .json({ errors: error.details.map((err) => err.message) });
  }
  next();
};

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email",
    "string.empty": "Email is required",
  }),
  verificationCode: Joi.string().required().messages({
    "string.empty": "Verification code is required",
  }),
  newPassword: Joi.string().min(6).required().messages({
    "string.min": "New password must be at least 6 characters long",
    "string.empty": "New password is required",
  }),
});

const validateResetPassword = (req, res, next) => {
  const { error } = resetPasswordSchema.validate(req.body);
  if (error) {
    console.log(error);

    return res
      .status(400)
      .json({ errors: error.details.map((err) => err.message) });
  }
  next();
};
module.exports = {
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
};
