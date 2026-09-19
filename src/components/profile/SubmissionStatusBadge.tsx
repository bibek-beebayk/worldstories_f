import { Badge } from "@/components/ui/badge";

const SubmissionStatusBadge = ({ status }: { status: string }) => {
  if (status === "approved") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Approved</Badge>;
  }
  if (status === "requires_edit") {
    return <Badge className="bg-amber-600 hover:bg-amber-600">Requires Edit</Badge>;
  }
  if (status === "rejected") {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  return <Badge variant="secondary">Pending Review</Badge>;
};

export default SubmissionStatusBadge;
