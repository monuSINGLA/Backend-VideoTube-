import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, // user who will subscribe
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, // user subcribe to another user channel or user
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
    