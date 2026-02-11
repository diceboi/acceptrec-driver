// @ts-nocheck
"use client";

import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Uppy, { type Uppy as UppyType, BasePlugin } from "@uppy/core";
import { debugLogger } from "@uppy/core";
import DashboardPlugin from "@uppy/dashboard";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

import "@uppy/core/css/style.css";
import "@uppy/dashboard/css/style.css";

// Custom plugin to handle simple PUT uploads to signed URLs without strict ETag checks
// @ts-ignore - BasePlugin typings are complex across versions
class SimpleSignedUrlUpload extends BasePlugin<any, any> {
  id: string;
  type: string;
  uppy: UppyType;

  constructor(uppy: UppyType, opts: any) {
    super(uppy, opts);
    this.id = 'SimpleSignedUrlUpload';
    this.type = 'uploader';
    this.uppy = uppy;
  }

  install() {
    this.uppy.addUploader(this.upload);
  }

  uninstall() {
    this.uppy.removeUploader(this.upload);
  }

  upload = (fileIDs: string[]) => {
    const promises = fileIDs.map(async (id) => {
      const file = this.uppy.getFile(id);
      try {
        // 1. Get signed URL
        const opts = (this as any).opts;
        const params = await opts.getUploadParameters(file);
        const url = params.url;

        this.uppy.setFileMeta(id, { uploadURL: url });

        // 2. Perform Upload
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          this.uppy.emit('upload-progress', file, { 
            uploader: this, 
            bytesUploaded: 0, 
            bytesTotal: file.size 
          });

          xhr.upload.addEventListener('progress', (ev) => {
            this.uppy.emit('upload-progress', file, { 
              uploader: this, 
              bytesUploaded: ev.loaded, 
              bytesTotal: ev.total 
            });
          });

          xhr.open('PUT', url, true);
          if (file.type) {
            xhr.setRequestHeader('Content-Type', file.type);
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const body = { location: url };
              this.uppy.emit('upload-success', file, { uploadURL: url, body });
              resolve();
            } else {
              this.uppy.emit('upload-error', file, { 
                name: 'UploadError', 
                message: `Upload failed with status ${xhr.status}` 
              });
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => {
            this.uppy.emit('upload-error', file, { 
              name: 'NetworkError', 
              message: 'Network error' 
            });
            reject(new Error('Network error'));
          };

          // file.data is File | Blob, which XHR accepts
          xhr.send(file.data as any);
        });
      } catch (err: any) {
        this.uppy.emit('upload-error', file, { 
          name: 'Error', 
          message: err.message || 'Error getting upload params' 
        });
        throw err;
      }
    });

    return Promise.all(promises);
  }
}

// Generate unique IDs for each uploader instance
let uppyInstanceCounter = 0;

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  buttonVariant = "outline",
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const instanceId = useRef(`uppy-dashboard-${++uppyInstanceCounter}`);
  const dashboardMountedRef = useRef(false);
  const uploadURLRef = useRef<string>("");
  
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
      },
      autoProceed: false,
    })
      .use(SimpleSignedUrlUpload as any, {
        getUploadParameters: async (file: any) => {
          const params = await onGetUploadParameters();
          uploadURLRef.current = params.url;
          return params;
        },
      })
      .on("complete", (result) => {
        // Enhance ALL successful files with upload URL via ref if needed (backup)
        if (result.successful && result.successful.length > 0) {
           // ... logic kept same ...
           result.successful.forEach((file, index) => {
            if (!(file as any).uploadURL) {
              const uploadURL = file.meta?.uploadURL || uploadURLRef.current;
              if (uploadURL) {
                (result.successful![index] as any).uploadURL = uploadURL;
              }
            }
          });
        }
        onComplete?.(result);
        setShowModal(false);
        uploadURLRef.current = "";
      })
  );

  useEffect(() => {
    if (showModal && !dashboardMountedRef.current) {
      // Only mount dashboard if not already mounted
      const targetElement = document.getElementById(instanceId.current);
      if (targetElement) {
        uppy.use(DashboardPlugin, {
          target: `#${instanceId.current}`,
          inline: true,
          proudlyDisplayPoweredByUppy: false,
        });
        dashboardMountedRef.current = true;
      }
    }

    if (!showModal && dashboardMountedRef.current) {
      // Clean up dashboard when modal closes
      const dashboard = uppy.getPlugin('Dashboard');
      if (dashboard) {
        uppy.removePlugin(dashboard);
        dashboardMountedRef.current = false;
      }
    }
  }, [showModal, uppy]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      uppy.cancelAll();
      // Remove all plugins
      // ...
    };
  }, [uppy]);

  return (
    <div>
      <Button 
        type="button"
        onClick={() => setShowModal(true)} 
        className={buttonClassName}
        variant={buttonVariant}
      >
        {children}
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative bg-background rounded-lg shadow-lg max-w-3xl w-full">
            <Button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 z-10"
              variant="ghost"
              size="sm"
            >
              Close
            </Button>
            <div id={instanceId.current} className="min-h-[400px]" />
          </div>
        </div>
      )}
    </div>
  );
}
