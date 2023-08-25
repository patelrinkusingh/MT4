module.exports = (sequelize, DataTypes) => {
    const MT5TerminalApps = sequelize.define("MT5TerminalApp", {
        system_name: {
            type: DataTypes.STRING,
        },
        path: {
            type: DataTypes.STRING,
        },
        time: {
            type: DataTypes.STRING,
        }
        
    });
    return MT5TerminalApps;
};
