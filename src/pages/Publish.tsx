import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";

const Publish = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* <Header /> */}
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3">Publish Your Story</h1>
          <p className="text-lg text-muted-foreground">Share your creativity with the world</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Story Details</CardTitle>
            <CardDescription>Fill in the information about your story</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div>
                <Label htmlFor="title">Story Title</Label>
                <Input id="title" placeholder="Enter your story title" className="mt-2" />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Write a compelling description for your story..."
                  className="mt-2 min-h-32"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Select>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="romance">Romance</SelectItem>
                      <SelectItem value="fantasy">Fantasy</SelectItem>
                      <SelectItem value="mystery">Mystery</SelectItem>
                      <SelectItem value="scifi">Sci-Fi</SelectItem>
                      <SelectItem value="horror">Horror</SelectItem>
                      <SelectItem value="drama">Drama</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Cover Image</Label>
                <div className="mt-2 border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 10MB
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="content">Story Content</Label>
                <Textarea 
                  id="content" 
                  placeholder="Start writing your story..."
                  className="mt-2 min-h-64"
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1">Publish Story</Button>
                <Button type="button" variant="outline">Save as Draft</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Publish;
