import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BlogPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 font-headline">Blog Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle> supervising
          <CardDescription>
            The integrated blog system is being built.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            Soon you will be able to create, edit, and manage blog posts, optimize for SEO, and track analytics. This feature will help you build an audience and market your books.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
