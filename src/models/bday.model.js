import mongoose   from "mongoose";

const bdaySchema = new mongoose.Schema({
    month:{
        type: String,
        required: true
    },
    day:{
        type: String,
        required: true
    },
    userId:{
        type: String,
        required: true
    },
    serverId: {
        type: String,
        required: true
    },
    username: {
        type: String,
    }
},{timestamps:true});

export const Bday = mongoose.model("Bday", bdaySchema);