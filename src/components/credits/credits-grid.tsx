import { Check, Coins, CreditCard, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CREDIT_PACKAGES,
  GENERATION_CREDIT_COST,
  GENERATION_REFUND_MESSAGE,
} from "@/config/product";
import { cn } from "@/lib/cn";

export function CreditsGrid() {
  return (
    <div>
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/7 p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">
            Генерация стоит {GENERATION_CREDIT_COST} кредита
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {GENERATION_REFUND_MESSAGE}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CREDIT_PACKAGES.map((item) => (
          <Card
            key={item.code}
            className={cn(
              "relative min-h-72 overflow-hidden",
              item.popular && "border-primary/45 bg-primary/[0.055]",
            )}
          >
            {item.popular ? (
              <Badge className="absolute right-4 top-4">Популярный</Badge>
            ) : null}
            <CardHeader>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                {item.name}
              </p>
              <CardTitle className="mt-5 flex items-end gap-2">
                <span className="text-5xl font-medium tracking-[-0.06em]">
                  {item.credits}
                </span>
                <span className="pb-1 text-sm font-normal text-muted-foreground">
                  кредитов
                </span>
              </CardTitle>
              <CardDescription>
                Хватит на {Math.floor(item.credits / GENERATION_CREDIT_COST)}{" "}
                генераций
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <p className="font-mono text-xl font-semibold">
                {item.priceUzs.toLocaleString("ru-RU")} soʻm
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="size-4 text-success" aria-hidden="true" />
                Кредиты не сгорают
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" disabled title="Оплата будет подключена следующим этапом">
                <CreditCard className="size-4" />
                Оплата скоро
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Coins className="mt-0.5 size-5 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">Оплата ещё не подключена</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Пакеты и экономика зафиксированы. Покупка станет доступна после
                подключения платёжного провайдера и серверной проверки платежа.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
