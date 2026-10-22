/**
 * useMedicalReports — upload (with progress / cancel / retry), remove and view
 * a patient's reports, either at checkout (pending) or for an existing booking.
 */

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  MAX_REPORTS,
  MAX_REPORT_BYTES,
  REPORT_EXTENSIONS,
  REPORT_ACCEPT,
  listPendingReports,
  uploadReport,
  deleteReport,
  fetchReportBlob,
} from "../services/medicalReportService";
import { openReportFile } from "../utils/openReportFile";

const extOf = (name) => {
  const i = String(name || "").lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
};

export default function useMedicalReports({ appointmentId = null, initialReports, loadPending = false } = {}) {
  const [reports, setReports] = useState(Array.isArray(initialReports) ? initialReports : []);
  const [uploads, setUploads] = useState([]); // { tempId, file, name, size, progress, status, error }
  const [removingId, setRemovingId] = useState(null);
  const controllers = useRef({});
  const inputRef = useRef(null);

  // checkout: reload reports already uploaded (survives refresh / back / PayPal round trip)
  useEffect(() => {
    if (!loadPending) return;
    let active = true;
    listPendingReports()
      .then((list) => active && setReports(list))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [loadPending]);

  // existing booking: follow the server copy when the parent refreshes it
  useEffect(() => {
    if (Array.isArray(initialReports)) setReports(initialReports);
  }, [initialReports]);

  // abort any in-flight upload when leaving the page
  useEffect(() => () => Object.values(controllers.current).forEach((c) => c.abort()), []);

  const slotsLeft = MAX_REPORTS - reports.length - uploads.length;
  const busy = uploads.some((u) => u.status === "uploading");

  const startUpload = (item) => {
    const controller = new AbortController();
    controllers.current[item.tempId] = controller;
    const fresh = { ...item, status: "uploading", progress: 0, error: null };
    setUploads((list) =>
      list.some((u) => u.tempId === item.tempId)
        ? list.map((u) => (u.tempId === item.tempId ? fresh : u))
        : [...list, fresh],
    );

    uploadReport(item.file, {
      appointmentId,
      signal: controller.signal,
      onProgress: (p) =>
        setUploads((list) => list.map((u) => (u.tempId === item.tempId ? { ...u, progress: p } : u))),
    })
      .then((report) => {
        setUploads((list) => list.filter((u) => u.tempId !== item.tempId));
        setReports((list) => [...list, report]);
      })
      .catch((err) => {
        if (axios.isCancel(err) || err?.name === "CanceledError") {
          setUploads((list) => list.filter((u) => u.tempId !== item.tempId));
          toast("Upload cancelled", { icon: "ℹ️" });
          return;
        }
        const msg =
          err?.response?.data?.message ||
          (err?.response ? "Upload failed. Please try again." : "Network problem — upload failed.");
        setUploads((list) =>
          list.map((u) => (u.tempId === item.tempId ? { ...u, status: "failed", error: msg } : u)),
        );
      })
      .finally(() => {
        delete controllers.current[item.tempId];
      });
  };

  const pickFiles = () => {
    if (slotsLeft <= 0) {
      toast.error("You can upload up to 2 reports. Remove one to add another.");
      return;
    }
    inputRef.current?.click();
  };

  const onFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // allow picking the same file again
    if (!files.length) return;

    let room = slotsLeft;
    for (const file of files) {
      if (room <= 0) {
        toast.error("Only 2 reports are allowed — extra files were skipped.");
        break;
      }
      if (!REPORT_EXTENSIONS.includes(extOf(file.name))) {
        toast.error(`"${file.name}" isn't supported. Use PDF, JPG, PNG, DOC or DOCX.`);
        continue;
      }
      if (!file.size) {
        toast.error(`"${file.name}" is empty.`);
        continue;
      }
      if (file.size > MAX_REPORT_BYTES) {
        toast.error(`"${file.name}" is larger than 5 MB.`);
        continue;
      }
      room -= 1;
      startUpload({
        tempId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        name: file.name,
        size: file.size,
      });
    }
  };

  const cancelUpload = (tempId) => controllers.current[tempId]?.abort();

  const retryUpload = (tempId) => {
    const item = uploads.find((u) => u.tempId === tempId);
    if (item) startUpload(item);
  };

  const dismissUpload = (tempId) => setUploads((list) => list.filter((u) => u.tempId !== tempId));

  const removeReport = async (reportId) => {
    try {
      setRemovingId(reportId);
      await deleteReport(reportId);
      setReports((list) => list.filter((r) => r._id !== reportId));
      toast.success("Report removed");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't remove the report. Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  const viewReport = async (report) => {
    try {
      await openReportFile(report, () => fetchReportBlob(report._id));
    } catch {
      toast.error("Couldn't open the report. Please try again.");
    }
  };

  const inputProps = {
    ref: inputRef,
    type: "file",
    accept: REPORT_ACCEPT,
    multiple: true,
    hidden: true,
    onChange: onFilesSelected,
  };

  return {
    reports,
    uploads,
    busy,
    slotsLeft,
    removingId,
    pickFiles,
    inputProps,
    cancelUpload,
    retryUpload,
    dismissUpload,
    removeReport,
    viewReport,
  };
}
