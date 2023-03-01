const mongoose = require('mongoose');
const {Schema, model} = mongoose;
const UserSchema = new Schema({

    username: {
        type: String,
        required: true,
        min: 6,
        unique: true        
    },
    password: {
        type: String,
        required: true,
        min: 8
    },
    email:{
        type: String,
        required: true,
        min: 8,
        unique: true
    },
    verified: {
        type: Boolean,
        default: false
    }
});


const UserModel = model('User', UserSchema);

module.exports = UserModel;
