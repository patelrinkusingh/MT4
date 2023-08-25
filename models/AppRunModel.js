module.exports = (sequelize, DataTypes) => {
    const apprunmodel = sequelize.define("AppRunList", {
        App_Name: {
            type: DataTypes.STRING,
        },
        App_Path: {
            type: DataTypes.STRING,
        },
        App_Start_Time: {
            type: DataTypes.STRING,
        }
    });
    return apprunmodel;
};
