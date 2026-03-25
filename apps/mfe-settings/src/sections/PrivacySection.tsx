import { useContext, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from '@familieoya/ui';
import { apiClient, AuthContext } from '@familieoya/api-client';

export default function PrivacySection() {
  const auth = useContext(AuthContext);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const handleDownloadData = async () => {
    setDownloadError('');
    setIsDownloading(true);
    try {
      const response = await apiClient.get('/auth/me/data-export', {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-data.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Failed to download data. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await apiClient.delete('/auth/me');
      await auth?.logout();
    } catch {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Data export */}
      <Card>
        <CardHeader>
          <CardTitle>Download your data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-slate-600">
            Download a copy of all data associated with your account in JSON
            format.
          </p>
          {downloadError && (
            <p className="text-sm text-red-600">{downloadError}</p>
          )}
          <Button
            variant="outline"
            disabled={isDownloading}
            onClick={() => void handleDownloadData()}
            className="self-start"
          >
            {isDownloading ? 'Preparing…' : 'Download my data'}
          </Button>
        </CardContent>
      </Card>

      {/* Delete account */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Delete account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-slate-600">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            className="self-start"
          >
            Delete my account
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-red-700">
              Delete account
            </h2>
            <p className="text-sm text-slate-600">
              This will permanently delete your account and all associated data.
              To confirm, type{' '}
              <span className="font-mono font-bold text-red-700">DELETE</span>{' '}
              below.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setConfirmText('');
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={confirmText !== 'DELETE' || isDeleting}
                onClick={() => void handleDeleteAccount()}
              >
                {isDeleting ? 'Deleting…' : 'Delete account'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
