import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { Resend } from "resend";

const resend = new Resend(import.meta.env.RESEND_API_KEY);

type TurnstileVerificationResult = {
  success: boolean;
  "error-codes"?: string[];
};

async function verifyTurnstile(token: string) {
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: import.meta.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Turnstile verification request failed");
  }

  return (await response.json()) as TurnstileVerificationResult;
}

export const server = {
  submitForm: defineAction({
    accept: "form",
    input: z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().min(8),
      message: z.string().min(1),
      turnstileToken: z
        .string()
        .min(1, "Please complete the spam check before submitting."),
    }),
    handler: async (input) => {
      const turnstileResult = await verifyTurnstile(input.turnstileToken);

      if (!turnstileResult.success) {
        console.error(
          "Turnstile verification failed",
          turnstileResult["error-codes"],
        );

        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Spam check failed. Please try again.",
        });
      }

      // Enquriy form submission email
      await resend.emails.send({
        to: import.meta.env.CONTACT_TO_EMAIL,
        template: {
          id: "contact-form-enquiry",
          variables: {
            NAME: input.name,
            PHONE: input.phone,
            EMAIL_VAR: input.email,
            SERVICE: input.service ?? "Not specified",
            MESSAGE: input.message,
          },
        },
      });

      // Confirmation email (to client)
      try {
        await resend.emails.send({
          to: input.email,
          template: {
            id: "confirmation-email",
            variables: { NAME: input.name },
          },
          // subject: "We received your enquiry",
          // text: `Hi ${input.name}, thanks for getting in touch. We'll be in touch shortly.`,
        });
        console.log("confirmation email sent to", input.email);
      } catch (error) {
        console.error("Confirmation email failed", error);
      }
      return { success: true };
    },
  }),
};
