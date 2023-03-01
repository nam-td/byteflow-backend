const mongoose = require("mongoose");
const {Schema, model}= mongoose;

const TokenSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User",
        unique: true,
    },
    token: {type: String, required: true},
    createAt: {type: Date, default: Date.now(), expires: 3600}
});

const TokenModel = model('Token', TokenSchema);
module.exports = TokenModel;