module.exports = {
    project: {
        android: {},
        ios: {}
    },
    commands: [
        {
            name: 'disable-hermes',
            func: () => {
                console.log('Hermes is disabled');
            }
        }
    ]
};
