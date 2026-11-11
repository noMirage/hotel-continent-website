import { useState } from "react";
import { Plus, Shield, ShieldCheck, User, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsSuperAdmin, useIsOwner } from "@/hooks/useUserRole";
import { format } from "date-fns";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrentUserId, useAdminUsersList } from "@/hooks/useAdminUsersData";
import type { AdminUser } from "@/hooks/useAdminUsersData";
import { useAdminUsersMutations } from "@/hooks/useAdminUsersMutations";

type AppRole = "admin" | "super_admin" | "viewer" | "owner" | "user";

export default function AdminUsers() {
  const { isSuperAdmin, isLoading: roleLoading } = useIsSuperAdmin();
  const { isOwner } = useIsOwner();
  const canManageUsers = isSuperAdmin || isOwner;
  const { t } = useLanguage();

  const [isAddDialogOpen,     setIsAddDialogOpen]     = useState(false);
  const [newAdminEmail,       setNewAdminEmail]       = useState("");
  const [newAdminRole,        setNewAdminRole]        = useState<AppRole>("admin");
  const [newAdminFullName,    setNewAdminFullName]    = useState("");
  const [deleteUserId,        setDeleteUserId]        = useState<string | null>(null);
  const [editingUser,         setEditingUser]         = useState<AdminUser | null>(null);
  const [editCommission,      setEditCommission]      = useState("");
  const [editCommissionManual, setEditCommissionManual] = useState("5");
  const [editCommissionSite,  setEditCommissionSite]  = useState("3");
  const [editFullName,        setEditFullName]        = useState("");

  const { data: currentUserId }              = useCurrentUserId();
  const { data: adminUsers, isLoading }      = useAdminUsersList(canManageUsers);

  const { addAdminMutation, updateRoleMutation, updateCommissionMutation, deleteRoleMutation } =
    useAdminUsersMutations({
      onAddSuccess: () => {
        setIsAddDialogOpen(false);
        setNewAdminEmail("");
        setNewAdminFullName("");
      },
      onUpdateCommissionSuccess: () => setEditingUser(null),
      onDeleteSuccess:           () => setDeleteUserId(null),
    });
  
  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case "owner":      return <ShieldCheck className="h-4 w-4 text-amber-500" />;
      case "super_admin": return <ShieldCheck className="h-4 w-4 text-primary" />;
      case "admin":      return <Shield className="h-4 w-4 text-muted-foreground" />;
      case "viewer":     return <User className="h-4 w-4 text-blue-500" />;
      default:           return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case "owner":      return <Badge className="bg-amber-500 text-white">{t("admin.roleOwner")}</Badge>;
      case "super_admin": return <Badge className="bg-primary text-primary-foreground">{t("users.superAdmin")}</Badge>;
      case "admin":      return <Badge variant="secondary">{t("users.admin")}</Badge>;
      case "viewer":     return <Badge variant="outline" className="text-blue-600 border-blue-300">{t("users.viewer")}</Badge>;
      default:           return <Badge variant="outline">{t("users.user")}</Badge>;
    }
  };
  
  if (roleLoading) {
    return (<div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>);
  }
  
  if (!canManageUsers) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{t("users.accessDenied")}</h2>
          <p className="text-muted-foreground">{t("users.superAdminOnly")}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("users.title")}</h1>
          <p className="text-muted-foreground">{t("users.subtitle")}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />{t("users.addAdmin")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("users.addNewAdmin")}</DialogTitle>
              <DialogDescription>{t("users.addNewAdminDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("users.emailAddress")}</Label>
                <Input id="email" type="email" placeholder="admin@example.com" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("users.name")}</Label>
                <Input id="fullName" placeholder={t("users.namePlaceholder")} value={newAdminFullName} onChange={(e) => setNewAdminFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t("users.role")}</Label>
                <Select value={newAdminRole} onValueChange={(v) => setNewAdminRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">{t("users.viewer")}</SelectItem>
                    <SelectItem value="admin">{t("users.admin")}</SelectItem>
                    <SelectItem value="super_admin">{t("users.superAdmin")}</SelectItem>
                    <SelectItem value="owner">{t("admin.roleOwner")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setNewAdminFullName(""); }}>{t("users.cancel")}</Button>
              <Button onClick={() => addAdminMutation.mutate({ email: newAdminEmail, role: newAdminRole })} disabled={!newAdminEmail || addAdminMutation.isPending}>
                {addAdminMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("users.addAdmin")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t("users.allAdmins")}</CardTitle>
          <CardDescription>{t("users.allAdminsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => (<Skeleton key={i} className="h-16 w-full" />))}</div>
          ) : adminUsers && adminUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("users.name")}</TableHead>
                  <TableHead>{t("users.role")}</TableHead>
                  <TableHead>{t("users.commissionRate")}</TableHead>
                  <TableHead>{t("users.added")}</TableHead>
                  <TableHead className="text-right">{t("users.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminUsers.map((user) => (
                  <TableRow key={user.id} className={cn(user.user_id === currentUserId && "bg-primary/5 ring-1 ring-inset ring-primary/20")}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span className="font-medium">{user.profile?.full_name || t("users.unnamedAdmin")}</span>
                        {user.user_id === currentUserId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{t("users.you")}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={user.role} onValueChange={(v) => updateRoleMutation.mutate({ userId: user.user_id, role: v as AppRole })}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">{t("users.viewer")}</SelectItem>
                          <SelectItem value="admin">{t("users.admin")}</SelectItem>
                          <SelectItem value="super_admin">{t("users.superAdmin")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingUser(user);
                        setEditCommission(String(user.profile?.commission_rate || 3));
                        setEditCommissionManual(String(user.profile?.commission_rate_manual ?? 5));
                        setEditCommissionSite(String(user.profile?.commission_rate_site ?? 3));
                        setEditFullName(user.profile?.full_name || "");
                      }}>
                        {user.profile?.commission_rate_manual ?? 5}% / {user.profile?.commission_rate_site ?? 3}%
                      </Button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(user.created_at), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteUserId(user.user_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">{t("users.noAdmins")}</p>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.editProfile")}</DialogTitle>
            <DialogDescription>{t("users.editProfileDesc", { name: editingUser?.profile?.full_name || t("users.unnamedAdmin") })}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullNameEdit">{t("users.name")}</Label>
              <Input id="fullNameEdit" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} placeholder={t("users.namePlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="commissionManual">{t("users.commissionManual")}</Label>
                <Input id="commissionManual" type="number" min="0" max="100" step="0.1" value={editCommissionManual} onChange={(e) => setEditCommissionManual(e.target.value)} />
                <p className="text-xs text-muted-foreground">{t("profile.commissionManualDesc")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionSite">{t("users.commissionSite")}</Label>
                <Input id="commissionSite" type="number" min="0" max="100" step="0.1" value={editCommissionSite} onChange={(e) => setEditCommissionSite(e.target.value)} />
                <p className="text-xs text-muted-foreground">{t("profile.commissionSiteDesc")}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>{t("users.cancel")}</Button>
            <Button onClick={() => { if (editingUser) updateCommissionMutation.mutate({ userId: editingUser.user_id, rate: parseFloat(editCommission) || 3, rateManual: parseFloat(editCommissionManual) || 5, rateSite: parseFloat(editCommissionSite) || 3, fullName: editFullName }); }} disabled={updateCommissionMutation.isPending}>
              {updateCommissionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("users.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("users.removeAccess")}</AlertDialogTitle>
            <AlertDialogDescription>{t("users.removeAccessDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("users.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteUserId && deleteRoleMutation.mutate(deleteUserId)}>
              {deleteRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("users.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
