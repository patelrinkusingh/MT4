module.exports = (sequelize, DataTypes) => {
    const MT4ErrorLog = sequelize.define("MT4ErrorLogList", {
        system_name: {
            type: DataTypes.STRING,
        },
        error: {
            type: DataTypes.STRING,
        },
        time: {
            type: DataTypes.STRING,
        }
    });
    return MT4ErrorLog;
};
