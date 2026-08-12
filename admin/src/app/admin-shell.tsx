import {
  ActionIcon,
  AppShell,
  Avatar,
  Burger,
  Button,
  Group,
  NavLink,
  Stack,
  Text,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChartBar,
  IconCoins,
  IconCreditCard,
  IconMoon,
  IconPhoto,
  IconPackage,
  IconSun,
  IconUsers,
} from "@tabler/icons-react";
import { useEffect } from "react";
import { NavLink as RouterLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/auth";
import { Wordmark } from "@/shared/ui";

const nav = [
  { to: "/", label: "Обзор", icon: IconChartBar },
  { to: "/users", label: "Пользователи", icon: IconUsers },
  { to: "/generations", label: "Генерации", icon: IconPhoto },
  { to: "/finance/orders", label: "Платежи", icon: IconCreditCard },
  { to: "/finance/transactions", label: "Кредиты", icon: IconCoins },
  { to: "/finance/packages", label: "Пакеты", icon: IconPackage },
] as const;

export function AdminShell() {
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();
  const { session, logout } = useAuth();
  const { setColorScheme } = useMantineColorScheme();
  const colorScheme = useComputedColorScheme("light");
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[data-page-title]")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);
  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 248, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding={{ base: "md", sm: "xl" }}
    >
      <AppShell.Header>
        <a className="skip-link" href="#admin-main">К основному содержимому</a>
        <Group h="100%" px={{ base: "md", sm: "xl" }} justify="space-between">
          <Group gap="md">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" w={44} h={44} aria-label="Открыть навигацию" />
            <Wordmark />
          </Group>
          <Group gap="sm">
            <Tooltip label={colorScheme === "dark" ? "Светлая тема" : "Тёмная тема"}>
              <ActionIcon
                size={44}
                variant="subtle"
                aria-label={colorScheme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
                onClick={() => setColorScheme(colorScheme === "dark" ? "light" : "dark")}
              >
                {colorScheme === "dark" ? <IconSun size={20} /> : <IconMoon size={20} />}
              </ActionIcon>
            </Tooltip>
            <Avatar color="blue" radius="xl">{session?.admin.account.slice(0, 1).toUpperCase()}</Avatar>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <AppShell.Section grow>
          <Text size="xs" tt="uppercase" c="dimmed" fw={700} px="sm" mb="sm">Управление</Text>
          <Stack gap={4}>
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                component={RouterLink}
                to={to}
                label={label}
                leftSection={<Icon size={19} />}
                active={to === "/" ? location.pathname === "/" : location.pathname.startsWith(to)}
                onClick={close}
                mih={44}
              />
            ))}
          </Stack>
        </AppShell.Section>
        <AppShell.Section pt="md">
          <Text size="xs" c="dimmed" px="sm" truncate>{session?.admin.account}</Text>
          <Button mt="sm" fullWidth variant="subtle" color="gray" onClick={() => void logout()}>Выйти</Button>
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main id="admin-main">
        <AppErrorBoundaryOutlet />
      </AppShell.Main>
    </AppShell>
  );
}

function AppErrorBoundaryOutlet() {
  return <Outlet />;
}
