module.exports = (sequelize, DataTypes) => {
    const ProfileFolderRestore = sequelize.define("ProfileFolderRestore", {
        system_name: {
            type: DataTypes.STRING,
        },
        profile_path: {
            type: DataTypes.STRING,
        },
        time: {
            type: DataTypes.STRING,
        }
    });
    return ProfileFolderRestore;
};
