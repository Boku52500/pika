import { z } from "zod";
import { customerInputSchema } from "@/server/validation/customer";
import { MIN_PASSWORD_LENGTH } from "@/lib/authValidation";

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `პაროლი უნდა შედგებოდეს მინიმუმ ${MIN_PASSWORD_LENGTH} სიმბოლოსგან`)
  .max(200, "პაროლი ძალიან გრძელია");

export const loginInputSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "შეიყვანეთ ელ. ფოსტა"),
  password: z.string().min(1, "შეიყვანეთ პაროლი"),
});

export const registerInputSchema = customerInputSchema
  .extend({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "გაიმეორეთ პაროლი"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "პაროლები არ ემთხვევა",
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = customerInputSchema.omit({ email: true });

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "შეიყვანეთ მიმდინარე პაროლი"),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "გაიმეორეთ ახალი პაროლი"),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "პაროლები არ ემთხვევა",
    path: ["confirmNewPassword"],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "ახალი პაროლი უნდა განსხვავდებოდეს მიმდინარესგან",
    path: ["newPassword"],
  });

export const forgotPasswordInputSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "შეიყვანეთ ელ. ფოსტა"),
});

export const resetPasswordInputSchema = z
  .object({
    token: z.string().trim().min(16, "ბმული არასწორია ან ვადაგასულია."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "გაიმეორეთ პაროლი"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "პაროლები არ ემთხვევა",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginInputSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
