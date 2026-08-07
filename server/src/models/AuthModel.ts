import { Schema, model } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: Number, enum: [1, 2], default: 1 },
  },
  { timestamps: true }
);

export const UserModel = model("User", UserSchema);
