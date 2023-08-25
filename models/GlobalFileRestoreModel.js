module.exports = (sequelize, DataTypes) => {
    const GlobalFileRestore = sequelize.define("GlobalFileRestore", {
        system_name: {
            type: DataTypes.STRING,
        },
        globalvar_path: {
            type: DataTypes.STRING,
        },
        time: {
            type: DataTypes.STRING,
        }
    });
    return GlobalFileRestore;
};
