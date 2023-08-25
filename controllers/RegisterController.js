const db = require("../models");
const jwtData = require('jsonwebtoken');
// create main Model
const bcrypt = require("bcrypt");
const Register = db.registers;
console.log("LoginController running...");
const { authSchema } = require("../config/validation_schema");
const passport = require("passport");

const index = (req, res) => {
    const logindata = req.session.logindata ? req.session.logindata : {};
    delete req.session.logindata;
    return res.render("Login", { logindata: logindata });
};
// const LoginData = async (req, res, next) => {
//     const email = req.body.email;
//     const password = req.body.password;
//     const lname = "admin";
//     const fname = "admin";
//     const cpassword = req.body.password;
//     const field = "Admin";
//     req.session.logindata = req.body;

//     try {
//         const existingUser = await Register.findOne({ where: { email: email } });
//         if (existingUser) {
//             req.flash("error", "This email is already in use. Please enter a different email.");
//             return res.redirect("back");
//         }

//         const result = await authSchema.validateAsync(req.body);
//         const hashedPassword = await bcrypt.hash(password, 10);
//         const hashedCPassword = await bcrypt.hash(cpassword, 10);
//         const token = jwtData.sign(result, "MAULIK", { expiresIn: "1day" });
//         console.log(token);
//         const data = {
//             fname: fname,
//             lname: lname,
//             email: email,
//             password: hashedPassword,
//             cpassword: hashedCPassword,
//             field: field,
//             token: token
//         };

//         const createdUser = await Register.create(data);
//         if (createdUser) {
//             console.log("User created successfully");
//             req.headers.authorization = `Bearer ${token}`;
//             return res.redirect("/AppPage");
//         } else {
//             console.log("Error creating user");
//             req.flash("error", "Error creating user");
//             return res.redirect("back");
//         }
//     } catch (err) {
//         const errorMessage = err.details[0].message;
//         req.flash("error", errorMessage);
//         return res.redirect("back");
//     }
// };
const LoginData = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const lname = "admin";
    const fname = "admin";
    const cpassword = req.body.password;
    const field = "Admin";
    req.session.logindata = req.body;
    console.log(req.session.logindata);

    try {
        const existingUser = await Register.findOne();
        if (!existingUser) {
            // Table is empty, insert static data
            const result = await authSchema.validateAsync(req.body);
            const hashedPassword = await bcrypt.hash(password, 10);
            const hashedCPassword = await bcrypt.hash(cpassword, 10);
            const token = jwtData.sign(result, "MAULIK", { expiresIn: "1day" });
            const data = {
                fname: fname,
                lname: lname,
                email: email,
                password: hashedPassword,
                cpassword: hashedCPassword,
                field: field,
            };

            const createdUser = await Register.create(data);
            if (createdUser) {
                console.log("User created successfully");
                req.session.user = { result }
                passport.authenticate("local", {
                    successRedirect: "/appPage",
                    failureRedirect: "/",
                    failureFlash: true,
                })(req, res, next);
                // req.session.token = token;

            } else {
                console.log("Error creating user");
                req.flash("error", "Error creating user");
                return res.redirect("back");
            }
        } else {
            // Table has data, check email and password
            const user = await Register.findOne({ where: { email: email } });
            if (!user) {
                req.flash("error", "Invalid email");
                return res.redirect("back");
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                req.flash("error", "Invalid password");
                return res.redirect("back");
            }

            const token = jwtData.sign({ id: user.id }, "MAULIK", { expiresIn: "1day" });
            req.session.user = { user }
            passport.authenticate("local", {
                successRedirect: "/appPage",
                failureRedirect: "/",
                failureFlash: true,
            })(req, res, next);
            // req.session.token = token;
        }
    } catch (err) {
        console.log(err);
        const errorMessage = err.details[0].message;
        req.flash("error", errorMessage);
        return res.redirect("back");
    }
};
const logout = async (req, res) => {
    req.logout(function (err) {
        if (err) {
            console.error("Error during logout:", err);
            return res.redirect("/");
        }
        res.redirect("/");
    });
};

module.exports = { index, LoginData, logout };
