"use client";

import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import DashboardPlugin from "@uppy/dashboard";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

import "@uppy/core/css/style.css";
import "@uppy/dashboard/css/style.css";

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
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async (file: any) => {
          const params = await onGetUploadParameters();
          // Store the upload URL in ref so we can access it in onComplete
          uploadURLRef.current = params.url;
          // Also store in file metadata
          uppy.setFileMeta(file.id, { uploadURL: params.url });
          return params;
        },
      })
      .on("complete", (result) => {
        // Enhance ALL successful files with upload URL if not already present
        if (result.successful && result.successful.length > 0) {
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
        // Reset ref for next upload
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
      // Cancel all uploads and remove plugins
      uppy.cancelAll();
      const dashboard = uppy.getPlugin('Dashboard');
      if (dashboard) {
        uppy.removePlugin(dashboard);
      }
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
