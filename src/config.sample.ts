export default {
    General: {
        ClientDomain: 'http://localhost:3001'
    },
    Database: {
        Type: 'mysql',
        Host: 'localhost',
        Port: 3306,
        Username: 'hometheater',
        Password: 'hometheaterpassword',
        Name: 'hometheater',
        Charset: 'utf8mb4_unicode_ci',
        AutoSync: false
    },
    Auth: {
        Password: 'adminpassword',
        JWTSecret: 'somejwtsecret'
    }
}