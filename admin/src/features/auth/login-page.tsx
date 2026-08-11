import {
  Button,
  Card,
  Center,
  Container,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { adminApi } from "../../shared/api";
import { clearAdminPhone, setAdminPhone } from "../../shared/admin-session";
import { RuvieLogo } from "../../shared/brand";
import { adminLoginSchema } from "./schema";

export function LoginPage({
  onAuthenticated,
}: {
  onAuthenticated: () => void;
}) {
  const form = useForm({
    mode: "uncontrolled",
    initialValues: { phone: "+998" },
    validate: (values) => {
      const result = adminLoginSchema.safeParse(values);
      return result.success
        ? {}
        : Object.fromEntries(
            Object.entries(result.error.flatten().fieldErrors).map(
              ([key, messages]) => [
                key,
                messages?.[0] ?? "Некорректное значение",
              ],
            ),
          );
    },
  });
  return (
    <Center mih="100vh" className="admin-grid">
      <Container size={420} w="100%">
        <Card withBorder shadow="xl" p="xl" bg="dark.8">
          <Stack gap="lg">
            <div>
              <RuvieLogo />
              <Title order={1} mt={8}>
                Администрирование
              </Title>
              <Text c="dimmed" mt="xs">
                Введите номер назначенного администратора.
              </Text>
            </div>
            <form
              onSubmit={form.onSubmit(async (values) => {
                setAdminPhone(values.phone);
                try {
                  await adminApi("/api/v1/admin/stats?period=today");
                  onAuthenticated();
                } catch {
                  clearAdminPhone();
                  notifications.show({
                    color: "red",
                    message: "Этот номер не имеет доступа к админке",
                  });
                }
              })}
            >
              <Stack>
                <TextInput
                  label="Номер телефона"
                  placeholder="+998901234567"
                  key={form.key("phone")}
                  {...form.getInputProps("phone")}
                />
                <Button type="submit" color="ruvie" fullWidth>
                  Войти
                </Button>
              </Stack>
            </form>
          </Stack>
        </Card>
      </Container>
    </Center>
  );
}
