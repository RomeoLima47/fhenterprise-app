"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function InvitationsPage() {
  const invitations = useQuery(api.invitations.listMyPending);
  const accept = useMutation(api.invitations.accept);
  const decline = useMutation(api.invitations.decline);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold">Invitations</h1>

      {invitations === undefined ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : invitations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-1 text-2xl">📬</p>
            <p className="text-muted-foreground">No pending invitations.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invitations.map((inv) => (
            <Card key={inv._id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">
                    {inv.inviterName} invited you to{" "}
                    <span className="font-semibold">{inv.projectName}</span>
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary">{inv.role}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => accept({ id: inv._id })}>
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decline({ id: inv._id })}
                  >
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
