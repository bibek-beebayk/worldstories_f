import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { BASIC_IDENTITY, PUBLISHER_IDENTITY, type SiteIdentity } from "@/lib/siteIdentity";

const IdentitySummary = ({ identity, active }: { identity: SiteIdentity; active: boolean }) => (
  <div className={`rounded-md border p-3 text-sm ${active ? "border-primary/40 bg-primary/5" : "opacity-60"}`}>
    <p className="font-medium">{identity.contactName}</p>
    {identity.location && <p className="text-muted-foreground">{identity.location}</p>}
    <p className="text-muted-foreground">{identity.email}</p>
    <p className="mt-2 text-xs text-muted-foreground">
      Footer: © 2026 WorldStories{identity.footerCredit && ` · ${identity.footerCredit}`}
    </p>
  </div>
);

/** Site-wide switches. Visitors see a change on their next page load, within a minute. */
const AdminSiteSettings = () => {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: storyApi.getAdminSiteSettings,
  });

  const update = useMutation({
    mutationFn: (show: boolean) => storyApi.updateAdminSiteSettings({ show_publisher_info: show }),
    onSuccess: (saved) => {
      queryClient.setQueryData(["admin-site-settings"], saved);
      toast.success(saved.show_publisher_info ? "Publisher info is now shown" : "Publisher info is now hidden");
    },
    onError: (error: Error) => toast.error(error.message || "Could not save the setting."),
  });

  const on = Boolean(settings?.show_publisher_info);

  return (
    // The admin shell's content section is overflow-hidden, so every page owns
    // its own scroll area.
    <div className="h-full space-y-6 overflow-y-auto pr-1">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Publisher info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p id="publisher-switch-label" className="text-sm font-medium">
                Show publisher info
              </p>
              <p className="text-xs text-muted-foreground">
                Names the publisher on the About and Contact pages and in the footer. When off, those show only
                WorldStories and the site's own email address.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-labelledby="publisher-switch-label"
              disabled={isLoading || update.isPending}
              onClick={() => update.mutate(!on)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60 ${
                on ? "bg-emerald-500" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`}
              />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">When on</p>
              <IdentitySummary identity={PUBLISHER_IDENTITY} active={on} />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">When off</p>
              <IdentitySummary identity={BASIC_IDENTITY} active={!on} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Visitors see a change on their next page load, within a minute.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSiteSettings;
