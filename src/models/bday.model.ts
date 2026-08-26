import { Schema, model } from "mongoose";

const bdaySchema = new Schema(
  {
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    day: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    userId: {
      type: String,
      required: true,
    },
    serverId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
    },
  },
  { timestamps: true },
);

export const Bday = model("Bday", bdaySchema);
