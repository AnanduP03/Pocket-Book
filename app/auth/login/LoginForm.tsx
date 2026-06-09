"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, FormField } from "@/components/ui/form-field";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    setSubmitting(false);
    if (!result || result.error) {
      form.setError("root", {
        message: "Email or password is incorrect.",
      });
      return;
    }
    router.replace(returnTo);
    router.refresh();
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <FormField>
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          {...form.register("email")}
          aria-invalid={Boolean(form.formState.errors.email)}
        />
        <FormError message={form.formState.errors.email?.message} />
      </FormField>

      <FormField>
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...form.register("password")}
          aria-invalid={Boolean(form.formState.errors.password)}
        />
        <FormError message={form.formState.errors.password?.message} />
      </FormField>

      <FormError message={form.formState.errors.root?.message} />

      <Button type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
