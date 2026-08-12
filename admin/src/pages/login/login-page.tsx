import { Anchor, Button, Card, Center, Container, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { z } from "zod";
import { useAuth } from "@/shared/auth";
import { Wordmark } from "@/shared/ui";

const loginSchema = z.object({
  phone: z.string().regex(/^\+998\d{9}$/, "Введите номер в формате +998XXXXXXXXX"),
  password: z.string().min(1, "Введите пароль"),
});

export function LoginPage() {
  const { login, devLogin } = useAuth();
  const [pending, setPending] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const form = useForm({
    initialValues: { phone: "+998", password: "" },
    validate: (values) => {
      const result = (devMode ? loginSchema.pick({ phone: true }) : loginSchema).safeParse(values);
      return result.success
        ? {}
        : Object.fromEntries(Object.entries(result.error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0]]));
    },
  });
  return (
    <Center mih="100vh" p="md">
      <Container size={420} w="100%">
        <Card withBorder shadow="sm" p={{ base: "lg", sm: "xl" }}>
          <Stack gap="lg">
            <div>
              <Wordmark />
              <Title order={1} mt="md">Администрирование</Title>
              <Text c="dimmed" mt="xs">Войдите по телефону и паролю администратора.</Text>
            </div>
            <form
              onSubmit={form.onSubmit(async (values) => {
                setPending(true);
                try {
                  if (devMode) await devLogin(values.phone);
                  else await login(values.phone, values.password);
                } catch (error) {
                  notifications.show({
                    color: "red",
                    title: "Вход не выполнен",
                    message: error instanceof Error ? error.message : "Проверьте данные администратора",
                  });
                } finally {
                  setPending(false);
                }
              })}
            >
              <Stack>
                <TextInput label="Номер телефона" autoComplete="tel" inputMode="tel" {...form.getInputProps("phone")} />
                {!devMode ? <PasswordInput label="Пароль" autoComplete="current-password" {...form.getInputProps("password")} /> : null}
                <Button type="submit" fullWidth loading={pending}>Войти</Button>
              </Stack>
            </form>
            {import.meta.env.DEV ? (
              <Anchor component="button" type="button" size="sm" onClick={() => setDevMode((value) => !value)}>
                {devMode ? "Использовать Supabase Auth" : "Dev-only вход без пароля"}
              </Anchor>
            ) : null}
          </Stack>
        </Card>
      </Container>
    </Center>
  );
}
