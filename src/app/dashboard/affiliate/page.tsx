import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AffiliatePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 font-headline">Affiliate Program</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Our affiliate system is currently under development.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            You will soon be able to track your referrals, view commission earnings, and manage your affiliate account right here. Stay tuned for updates!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
