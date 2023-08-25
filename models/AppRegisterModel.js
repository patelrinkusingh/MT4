module.exports = (sequelize, DataTypes) => {
    const appregisters = sequelize.define("AppAdd", {
        name: {
            type: DataTypes.STRING,
        },
        path: {
            type: DataTypes.STRING,
        }
    });
    return appregisters;
};
