import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiEdit3, FiCheck, FiAlertCircle } from "react-icons/fi";
import { useAtom } from "jotai";
import { settingsAtom } from "@/store/settings";
import { createWalletChangeRequest } from "@/services/backend.service";
import ThemeSelector from "./ThemeSelector";

interface SettingPanelProps {
  connectedWallet?: string;
}

const SettingPanel: React.FC<SettingPanelProps> = ({ connectedWallet = "" }) => {
  const [settings, setSettings] = useAtom(settingsAtom);
  const [newAddress, setNewAddress] = useState("");
  const [email, setEmail] = useState("");
  const [discord, setDiscord] = useState("");
  const [twitter, setTwitter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const currentWalletAddress = connectedWallet.trim();

  const handleSubmitWalletChange = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createWalletChangeRequest({
        old_address: currentWalletAddress,
        new_address: newAddress.trim(),
        email: email.trim(),
        discord_handle: discord.trim(),
        twitter_username: twitter.trim(),
      });
      setSuccess(result.message);
      setNewAddress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit wallet change request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="darkMode" className="font-medium">
            Dark Mode
          </Label>
          <p className="text-sm text-gray-500">Toggle dark mode appearance</p>
        </div>
        <Switch
          id="darkMode"
          checked={settings.darkMode}
          onCheckedChange={(checked) => setSettings({ darkMode: checked })}
        />
      </div>

      <ThemeSelector />
      <Separator />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="tickOffset" className="font-medium">
              Tick Offset
            </Label>
            <p className="text-sm text-gray-500">Current value: {settings.tickOffset}</p>
          </div>
          <span className="text-sm font-medium">{settings.tickOffset}</span>
        </div>
        <Slider
          id="tickOffset"
          min={15}
          max={30}
          step={1}
          value={[settings.tickOffset]}
          onValueChange={(value) => setSettings({ tickOffset: value[0] })}
          className="w-full"
        />
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <FiEdit3 className="h-5 w-5 text-blue-600" />
            Zealy Wallet Change Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Submit your current wallet and account details to request a Zealy wallet address change.
          </p>

          <div className="space-y-2">
            <Label>Current Wallet Address</Label>
            <Input
              value={currentWalletAddress}
              readOnly
              disabled
              placeholder="Connect your wallet"
            />
            <p className="text-xs text-gray-500">This is auto-filled from your connected wallet and cannot be changed.</p>
          </div>

          <div className="space-y-2">
            <Label>New Wallet Address</Label>
            <Input
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Enter your new wallet address"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your Zealy email"
              />
            </div>
            <div className="space-y-2">
              <Label>Discord Username</Label>
              <Input
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder="Enter your Discord username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Twitter Username</Label>
            <Input
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="Enter your Twitter username"
            />
          </div>

          <Button onClick={handleSubmitWalletChange} disabled={submitting || !currentWalletAddress} className="w-full md:w-auto">
            {submitting ? "Submitting..." : "Submit Wallet Change Request"}
          </Button>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">
              <FiAlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-600 dark:bg-green-950/30">
              <FiCheck className="h-4 w-4" />
              {success}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingPanel;
