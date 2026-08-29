import { connect } from "mongoose";

export const connectDB = async () => {
  try {
    await connect(`${process.env.MONGO_URI}`);
    console.log("DB Connected Successfully");
  } catch (error) {
    if (error instanceof Error) {
      console.error("CRITICAL ERROR: Failed to connect to DB", error.message);
    } else {
      console.error("CRITICAL ERROR: Failed to connect to DB", error);
    }
    // If DB fails, the bot shouldn't even try to start, otherwise commands will crash
    process.exit(1);
  }
};
