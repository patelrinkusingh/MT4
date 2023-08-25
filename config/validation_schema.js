const Joi = require("joi");

// const authSchema = Joi.object({
//     email: Joi.string().trim().email().required(),
//     password: Joi.string().min(3).max(15).required(),
// });

const authSchema = Joi.object({
    email: Joi.string().trim().email().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required',
    }),
    password: Joi.string().min(3).max(15).required().messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 3 characters long',
        'string.max': 'Password can be maximum 15 characters long',
        'any.required': 'Password is required',
    }),
});

const AppSchema = Joi.object({
    name: Joi.string().required().messages({
        'string.empty': 'Name is required',
        'any.required': 'Name is required',
    }),
    path: Joi.string().required().messages({
        'string.empty': 'Path is required',
        'any.required': 'path is required',
    }),
});

const UserregisterSchema = Joi.object({
    fname: Joi.string().required().messages({
        'string.empty': 'First Name is required',
        'any.required': 'First Name is required',
    }),
    lname: Joi.string().required().messages({
        'string.empty': 'Last Name is required',
        'any.required': 'Last Name is required',
    }),
    email: Joi.string().trim().email().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required',
    }),
    password: Joi.string().min(3).max(15).required().messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 3 characters long',
        'string.max': 'Password can be maximum 15 characters long',
        'any.required': 'Password is required',
    }),
    cpassword: Joi.string().min(3).max(15).required().messages({
        'string.empty': 'Confirm Password is required',
        'string.min': 'Confirm Password must be at least 3 characters long',
        'string.max': 'Confirm Password can be maximum 15 characters long',
        'any.required': 'Confirm Password is required',
    }),
    field: Joi.required().messages({
        'string.empty': 'field is required',
        'any.required': 'field is required',
    }),
});
const UserEditSchema = Joi.object({
    editid: Joi.string().required(),
    fname: Joi.string().required().messages({
        'string.empty': 'First Name is required',
        'any.required': 'First Name is required',
    }),
    lname: Joi.string().required().messages({
        'string.empty': 'Last Name is required',
        'any.required': 'Last Name is required',
    }),
    email: Joi.string().trim().email().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required',
    }),
    password: Joi.string().min(3).max(15).optional().messages({
        'string.min': 'Password must be at least 3 characters long',
        'string.max': 'Password can be maximum 15 characters long',
    }),
    cpassword: Joi.string().min(3).max(15).optional().valid(Joi.ref('password')).messages({
        'string.min': 'Confirm Password must be at least 3 characters long',
        'string.max': 'Confirm Password can be maximum 15 characters long',
        'any.only': 'Confirm Password must match the Password',
    }),
    field: Joi.required().messages({
        'string.empty': 'field is required',
        'any.required': 'field is required',
    }),
});
module.exports = {
    authSchema, AppSchema, UserregisterSchema, UserEditSchema
};