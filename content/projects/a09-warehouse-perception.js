project({
  id: "a09",
  level: "advanced",
  title: "Warehouse safety perception system (computer vision)",
  industry: "Logistics / Workplace safety",
  client: "Northgate Logistics: a warehousing company with 14 warehouses, 1,100 cameras already on the walls and 600 forklifts",
  time: "2–3 days of study",
  summary: "A computer vision system that watches existing warehouse cameras, finds people and forklifts, follows each one across frames, measures real distances on the floor, and reports near-misses and missing safety vests. A small trained detector does the seeing on site; a vision-language model gives a second opinion only on unclear events; humans review. Evaluated with detection, tracking and event-level metrics on replayed footage.",
  newConcepts: ["How a computer 'sees' (pixels, frames, fps)", "Object detection: boxes, labels, confidence", "IoU and non-maximum suppression", "Multi-object tracking (stable ids)", "Homography: from pixels to metres", "Edge inference (ONNX Runtime / TensorRT)", "Vision-language models as a second opinion", "mAP and event-level metrics", "Camera health, data drift and active learning"],
  patterns: ["model-cascade", "structured-output", "guardrails", "human-in-loop", "eval-harness", "observability", "feedback-flywheel"],
  skills: ["Designing perception pipelines (detect → track → measure → decide)", "Choosing between small trained models and foundation models with napkin maths", "Evaluating vision systems with the metrics that match the business goal"],

  brief: md`
> "Last year we had 41 reported forklift near-misses. Our insurer thinks the real number is ten times that, because nobody reports a near-miss unless someone gets hurt. We already have 1,100 cameras recording 24/7 that nobody watches. Can they tell us where and when people and forklifts get too close, so we can fix layouts and coach drivers *before* someone is injured? And our union rep says: no face recognition, no spying on individuals."
> (Head of Health & Safety, Northgate Logistics)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| What exactly counts as a near-miss? | A person within **2 m** of a **moving** forklift (parked forklifts don't count) | A precise rule with numbers, so normal code can check it |
| Other rules? | People in "vest required" zones must wear a hi-vis vest | Second detector class (~hi_vis_vest~) and floor zones |
| Cameras? | 1,100 IP cameras, 1080p, mixed angles, some fisheye, streamed over RTSP | Must handle many viewpoints; calibrate each camera once |
| Network? | Each warehouse has a slow internet uplink (50 Mbit/s shared) | 1,100 video streams **cannot** go to the cloud: process **on site** ("at the edge") |
| How fast? | The driver warning light must react in < 1 s; supervisor reports can wait minutes | Two paths: a fast local one and a slower reviewed one |
| Privacy? | No face recognition, no tracking of named individuals, faces blurred in any saved clip, clips deleted after 30 days | Privacy is a design requirement, not an afterthought |
| What happens with an alert? | Supervisors review a daily list; patterns feed layout changes and coaching | A missed event is bad, but 200 false alarms a day means nobody reads the list |
| Labelled data? | None yet. Safety team can label ~2,000 frames in a month | Start from a pre-trained detector and fine-tune it |

**Success:** on replayed footage with labelled events, near-miss **recall ≥ 85%** and **precision ≥ 70%**; **< 15 alerts per supervisor per shift**; warning light latency **p95 < 1 s**; **zero** faces visible in stored clips; detector mAP@0.5 ≥ 0.80 on cameras it was never trained on.
`,

  frame: md`
**Shape:** this is *sort + extract*, but from **pictures** instead of text, and continuously: 10 pictures a second, forever. The problem splits into a chain that every perception system shares: **detect** (what is in this frame, and where?) → **track** (multi-object tracking: is this the same person as one frame ago?) → **measure** (how far apart are they in metres?) → **decide** (does a safety rule fire?).

**Napkin maths decides the architecture** ([[f:cost-latency]]):
- 1,100 cameras × 10 frames per second × 86,400 seconds = **~950 million frames a day**.
- Sending every frame to a large vision-language model would cost millions of dollars a day and need far more bandwidth than the warehouses have. **Impossible.**
- A small trained detector (YOLO-style, ~10 million numbers inside) runs one frame in ~5 ms on a $1,000 on-site GPU box. One box can serve ~40 cameras. **Cheap and fast.**
- Rules produce maybe 300 candidate events a day across all sites. Asking a vision-language model about *those* costs a few dollars a day. **Affordable.**

So this is a **model cascade** ([[p:model-cascade]]) stretched across two worlds: a small, specialised model does the constant seeing; a big foundation model is the careful second opinion on rare unclear cases; a human has the final say ([[p:human-in-loop]]).

**Model sees, code decides** ([[f:probabilistic-core]]). The detector only says "box, label, confidence". The *rule* "under 2 m from a forklift moving faster than 0.5 m/s, for 0.4 s" is plain Python you can test and explain to the union rep line by line.

**The fast path has no AI service in it.** The warning light is driven by on-site rules only, because a network call can't be part of a sub-second safety loop. The vision-language model only filters the supervisor's review list, where a few seconds don't matter.

**Privacy by design** ([[p:guardrails]]): the system detects *"a person"*, never *who*. Faces are blurred on the box before any frame is saved or sent anywhere, and track ids reset every few seconds of absence, so nobody can be followed through a day.
`,

  design: md`
~~~text
   ON SITE (one GPU "edge box" per ~40 cameras)                                   CLOUD
 ┌──────────────────────────────────────────────────────────────────────┐
 │ camera (RTSP) ─▶ capture thread (keeps only the newest frame)        │
 │                     │ ~10 fps                                        │
 │                     ▼                                                │
 │   DETECT   YOLO detector (ONNX Runtime / TensorRT, ~5 ms)            │
 │            → boxes: person · forklift · pallet_jack · hi_vis_vest     │
 │                     ▼                                                │
 │   TRACK    tracker: same object = same id across frames              │
 │                     ▼                                                │
 │   MEASURE  homography: foot point in pixels → (x, y) metres on floor │
 │            speed (m/s), zones (vest-required, walkways)              │
 │                     ▼                                                │
 │   DECIDE   rule engine (plain Python, unit-tested)                   │
 │            ├─▶ FAST PATH: warning light / buzzer on forklift (<1 s)  │
 │            └─▶ event + 6 s clip (faces blurred) ────────────────────────▶  triage cascade
 └──────────────────────────────────────────────────────────────────────┘     │ severity high → alert
                                                                              │ severity low  → log only
   health + drift metrics (sharpness, brightness, confidence histograms) ───▶ │ unclear → vision-language
                                                                              │   model (3 keyframes,
                                                                              │   structured verdict)
                                                                              │     yes → alert
                                                                              │     no  → log (training data)
                                                                              │     unsure → human review
                                                                              ▼
                                         supervisor dashboard · weekly heat maps · labelling queue
                                                                              │
                                     active learning: unsure frames → labelled → retrain → shadow test → deploy
~~~

**Why each piece exists:**
- **Capture thread keeps only the newest frame.** If processing falls behind, old frames are thrown away instead of piling up. A 10-second-old frame is useless for safety.
- **Tracker.** Without stable ids, the rule can't know that the person in frame 12 is the same one as in frame 11, so it couldn't measure speed, require the condition to *persist*, or avoid sending one alert per frame.
- **Homography.** Pixels lie: 100 pixels near the camera might be 1 m, while 100 pixels at the far end might be 8 m. Four marked points on the floor fix that once per camera.
- **Edge processing.** Bandwidth and privacy both say: video stays in the building, and only small events and blurred clips leave.
`,

  tree: txt`
warehouse-perception/
├── perception/
│   ├── types.py             # Detection, Track, IoU
│   ├── detector.py          # letterbox → ONNX model → decode → NMS
│   ├── tracker.py           # stable ids across frames (SORT / ByteTrack style)
│   ├── floor.py             # homography, speed, zones
│   ├── rules.py             # near-miss and vest rules (no AI here)
│   └── pipeline.py          # capture thread, 10 fps loop, privacy blur, metrics
├── training/
│   └── train_detector.py    # split by camera, fine-tune, export to ONNX
├── verify/
│   └── vlm_check.py         # second opinion on unclear events (Claude vision)
├── tests/
│   └── test_rules.py        # synthetic scenes: no camera or GPU needed
├── evals/
│   ├── detection_eval.py    # mAP per class, sliced by camera and lighting
│   └── event_eval.py        # event precision / recall, alerts per shift
└── ops/
    └── drift.py             # camera health, drift score, active learning
`,

  build: [
    {
      file: "perception/types.py",
      patterns: ["structured-output"],
      note: md`The shared vocabulary of the whole system. A **detection** is one box in one frame. A **track** is one object followed across many frames: it has an id, a velocity, and a history of floor positions. **IoU** (intersection over union) is the single most used number in computer vision: how much two boxes overlap, from 0 (not at all) to 1 (identical). It's written with NumPy so it compares *every* box with *every* other box in one go.`,
      code: py`
from dataclasses import dataclass, field
from typing import Literal

import numpy as np

Label = Literal["person", "forklift", "pallet_jack", "hi_vis_vest"]


@dataclass
class Detection:
    box: np.ndarray            # [x1, y1, x2, y2] in pixels (top-left and bottom-right corners)
    score: float               # detector confidence, 0..1
    label: Label


@dataclass
class Track:
    id: int
    label: Label
    box: np.ndarray
    velocity: np.ndarray = field(default_factory=lambda: np.zeros(4))   # pixels per frame, per box corner value
    hits: int = 1              # frames in which it was matched
    misses: int = 0            # consecutive frames without a match
    state: Literal["tentative", "confirmed", "lost"] = "tentative"
    history: list = field(default_factory=list)   # floor positions in metres, newest last

    def foot_point(self) -> tuple[float, float]:
        """Bottom-centre of the box: where the person or vehicle touches the floor."""
        x1, y1, x2, y2 = self.box
        return float((x1 + x2) / 2), float(y2)


def iou(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Intersection over union between every box in a (N,4) and every box in b (M,4) -> (N,M)."""
    a, b = np.atleast_2d(a), np.atleast_2d(b)
    x1 = np.maximum(a[:, None, 0], b[None, :, 0])
    y1 = np.maximum(a[:, None, 1], b[None, :, 1])
    x2 = np.minimum(a[:, None, 2], b[None, :, 2])
    y2 = np.minimum(a[:, None, 3], b[None, :, 3])
    inter = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
    area_a = (a[:, 2] - a[:, 0]) * (a[:, 3] - a[:, 1])
    area_b = (b[:, 2] - b[:, 0]) * (b[:, 3] - b[:, 1])
    return inter / (area_a[:, None] + area_b[None, :] - inter + 1e-9)
`,
    },
    {
      file: "training/train_detector.py",
      patterns: ["eval-harness"],
      note: md`**Fine-tuning a detector.** We start from a model already trained on millions of everyday photos (it already knows "person"), and teach it warehouse things: forklifts, pallet jacks, vests, odd camera angles, night lighting. The most important line isn't the training call: it's **splitting by camera**. Frames from the same camera a second apart are almost identical. If some went to training and their neighbours to testing, the test would be an exam the model had already seen, and the score would be a lie.`,
      code: py`
import random
import shutil
from collections import defaultdict
from pathlib import Path

from ultralytics import YOLO

DATA = Path("data/labelled")          # images/<camera>__<timestamp>.jpg + labels/<same name>.txt (YOLO format)
OUT = Path("data/split")
CLASSES = ["person", "forklift", "pallet_jack", "hi_vis_vest"]


def split_by_camera(val_share: float = 0.2, seed: int = 7) -> dict[str, list[str]]:
    """Whole cameras go to train OR val, never both. Neighbouring frames are near-copies, so a random
    frame split would let the model 'see the exam' and report a score it will never reach in real life."""
    by_cam = defaultdict(list)
    for img in sorted((DATA / "images").glob("*.jpg")):
        by_cam[img.stem.split("__")[0]].append(img)
    cams = sorted(by_cam)
    random.Random(seed).shuffle(cams)
    n_val = max(1, round(len(cams) * val_share))
    split = {"val": cams[:n_val], "train": cams[n_val:]}
    for part, part_cams in split.items():
        for sub in ("images", "labels"):
            (OUT / part / sub).mkdir(parents=True, exist_ok=True)
        for cam in part_cams:
            for img in by_cam[cam]:
                shutil.copy(img, OUT / part / "images" / img.name)
                shutil.copy(DATA / "labels" / f"{img.stem}.txt", OUT / part / "labels" / f"{img.stem}.txt")
    return split


def write_dataset_yaml() -> Path:
    path = OUT / "warehouse.yaml"
    names = "\n".join(f"  {i}: {n}" for i, n in enumerate(CLASSES))
    path.write_text(f"path: {OUT.resolve()}\ntrain: train/images\nval: val/images\nnames:\n{names}\n")
    return path


if __name__ == "__main__":
    split = split_by_camera()
    print("val cameras:", split["val"])
    model = YOLO("yolo11s.pt")                     # start from a model pre-trained on everyday photos (COCO)
    model.train(data=str(write_dataset_yaml()), epochs=80, imgsz=640, batch=32,
                hsv_v=0.5, degrees=5, mosaic=1.0,  # augmentations: brightness swings (night shift), slight tilt
                patience=15, project="runs", name="warehouse_v3")
    metrics = model.val()                          # mAP on the held-out cameras
    print({"mAP50": round(metrics.box.map50, 3), "mAP50-95": round(metrics.box.map, 3)})
    model.export(format="onnx", imgsz=640, simplify=True)   # the edge boxes run ONNX Runtime / TensorRT
`,
    },
    {
      file: "perception/detector.py",
      patterns: [],
      note: md`**Running the detector on the edge box.** Three steps every detector needs: **prepare** the picture the way the model was trained (resize without stretching, pad to a 640×640 square, scale colours to 0..1), **run** the model, then **clean up** its raw output. The model proposes thousands of candidate boxes, many of them slightly shifted copies of the same forklift. **Non-maximum suppression (NMS)** keeps the best box and throws away near-duplicates. ONNX Runtime picks the fastest hardware available: TensorRT, then CUDA, then plain CPU.`,
      code: py`
import cv2
import numpy as np
import onnxruntime as ort

from perception.types import Detection, iou

LABELS = ["person", "forklift", "pallet_jack", "hi_vis_vest"]
INPUT = 640                     # the model was trained on 640x640 images
MIN_SCORE = {"person": 0.35, "forklift": 0.45, "pallet_jack": 0.45, "hi_vis_vest": 0.40}


def letterbox(frame: np.ndarray) -> tuple[np.ndarray, float, tuple[int, int]]:
    """Resize keeping the shape (no stretching), then pad to a 640x640 square with grey."""
    h, w = frame.shape[:2]
    scale = INPUT / max(h, w)
    nh, nw = round(h * scale), round(w * scale)
    resized = cv2.resize(frame, (nw, nh), interpolation=cv2.INTER_LINEAR)
    top, left = (INPUT - nh) // 2, (INPUT - nw) // 2
    canvas = np.full((INPUT, INPUT, 3), 114, dtype=np.uint8)
    canvas[top:top + nh, left:left + nw] = resized
    return canvas, scale, (left, top)


def nms(boxes: np.ndarray, scores: np.ndarray, threshold: float = 0.5) -> list[int]:
    """Non-maximum suppression: keep the best box, drop boxes overlapping it too much, repeat."""
    order = scores.argsort()[::-1]
    keep = []
    while order.size:
        best = order[0]
        keep.append(int(best))
        overlaps = iou(boxes[best], boxes[order[1:]])[0]
        order = order[1:][overlaps < threshold]
    return keep


class Detector:
    def __init__(self, model_path: str):
        providers = ["TensorrtExecutionProvider", "CUDAExecutionProvider", "CPUExecutionProvider"]
        self.session = ort.InferenceSession(model_path, providers=providers)
        self.input_name = self.session.get_inputs()[0].name

    def __call__(self, frame_bgr: np.ndarray) -> list[Detection]:
        img, scale, (left, top) = letterbox(frame_bgr)
        blob = img[:, :, ::-1].transpose(2, 0, 1)[None].astype(np.float32) / 255.0   # BGR->RGB, HWC->NCHW, 0..1
        raw = self.session.run(None, {self.input_name: blob})[0][0]                   # (4 + classes, candidates)
        raw = raw.T                                                                    # one row per candidate box
        cls_scores = raw[:, 4:]
        cls = cls_scores.argmax(axis=1)
        score = cls_scores.max(axis=1)
        thresholds = np.array([MIN_SCORE[LABELS[c]] for c in cls])
        mask = score >= thresholds
        raw, cls, score = raw[mask], cls[mask], score[mask]
        cx, cy, w, h = raw[:, 0], raw[:, 1], raw[:, 2], raw[:, 3]
        boxes = np.stack([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], axis=1)
        boxes = (boxes - [left, top, left, top]) / scale                              # undo the letterbox
        boxes = boxes.clip(0, [frame_bgr.shape[1], frame_bgr.shape[0]] * 2)
        out = []
        for c in np.unique(cls):                                                       # NMS per class
            idx = np.where(cls == c)[0]
            for k in nms(boxes[idx], score[idx]):
                i = idx[k]
                out.append(Detection(box=boxes[i], score=float(score[i]), label=LABELS[c]))
        return out
`,
    },
    {
      file: "perception/tracker.py",
      patterns: [],
      note: md`**Giving every object a stable id.** Each frame, we *predict* where every known object should be now (it keeps moving the same way), then pair predictions with new detections so the total overlap is as large as possible (the **Hungarian algorithm** solves this pairing perfectly). Two tricks from the ByteTrack paper: match **confident** detections first, then use **weak** detections only to keep existing tracks alive (a person half-hidden behind a pallet gives a weak box, but it's still them). New objects must be seen 3 times before they count, which filters out one-frame flickers.`,
      code: py`
import numpy as np
from scipy.optimize import linear_sum_assignment

from perception.types import Detection, Track, iou

CONFIRM_AFTER = 3        # matched in 3 frames before we trust it (filters one-frame flickers)
MAX_MISSES = 15          # keep a lost track for 15 frames (1.5 s at 10 fps) in case it reappears
MIN_IOU = 0.3            # weaker overlaps than this are not the same object
SMOOTH = 0.6             # how much to trust the new box versus the predicted one


class Tracker:
    """Gives every object a stable id across frames (a simplified SORT/ByteTrack)."""

    def __init__(self):
        self.tracks: list[Track] = []
        self._next_id = 1

    def _predict(self):
        for t in self.tracks:
            t.box = t.box + t.velocity                      # constant velocity: assume it keeps moving the same way

    def _match(self, tracks: list[Track], dets: list[Detection]) -> tuple[list, list, list]:
        if not tracks or not dets:
            return [], list(range(len(tracks))), list(range(len(dets)))
        cost = 1 - iou(np.array([t.box for t in tracks]), np.array([d.box for d in dets]))
        for i, t in enumerate(tracks):                      # never match a person to a forklift
            for j, d in enumerate(dets):
                if t.label != d.label:
                    cost[i, j] = 1.0
        rows, cols = linear_sum_assignment(cost)            # the Hungarian algorithm: best overall pairing
        pairs = [(r, c) for r, c in zip(rows, cols) if cost[r, c] <= 1 - MIN_IOU]
        matched_t, matched_d = {r for r, _ in pairs}, {c for _, c in pairs}
        return (pairs, [i for i in range(len(tracks)) if i not in matched_t],
                [j for j in range(len(dets)) if j not in matched_d])

    def update(self, dets: list[Detection]) -> list[Track]:
        self._predict()
        # ByteTrack idea: match confident detections first, then let weak ones rescue existing tracks.
        strong = [d for d in dets if d.score >= 0.5]
        weak = [d for d in dets if d.score < 0.5]
        pairs, free_tracks, free_strong = self._match(self.tracks, strong)
        for ti, di in pairs:
            self._apply(self.tracks[ti], strong[di])
        left = [self.tracks[i] for i in free_tracks]
        pairs2, still_free, _ = self._match(left, weak)
        for ti, di in pairs2:
            self._apply(left[ti], weak[di])
        for i in still_free:
            t = left[i]
            t.misses += 1
            t.velocity *= 0.5                               # unsure where it went: slow the guess down
            if t.state == "tentative":
                t.misses = MAX_MISSES + 1                   # never confirmed: probably a flicker, drop it
            elif t.misses > 2:
                t.state = "lost"
        for di in free_strong:                              # brand-new objects start as tentative
            d = strong[di]
            self.tracks.append(Track(id=self._next_id, label=d.label, box=d.box.astype(float)))
            self._next_id += 1
        self.tracks = [t for t in self.tracks if t.misses <= MAX_MISSES]
        return [t for t in self.tracks if t.state == "confirmed"]

    def _apply(self, t: Track, d: Detection):
        new_box = SMOOTH * d.box + (1 - SMOOTH) * t.box     # blend measurement and prediction
        t.velocity = 0.7 * t.velocity + 0.3 * (new_box - (t.box - t.velocity))
        t.box, t.hits, t.misses = new_box, t.hits + 1, 0
        if t.hits >= CONFIRM_AFTER:
            t.state = "confirmed"
`,
    },
    {
      file: "perception/floor.py",
      patterns: [],
      note: md`**From pixels to metres.** A **homography** is a 3×3 grid of numbers that maps points on a flat surface seen at an angle (the floor in the camera image) to the same surface seen from straight above (the floor plan). During installation, someone marks 4 or more points whose real positions are known (tape marks, column corners) and clicks them in the image; ~cv2.findHomography~ works out the grid. We map each object's **foot point** (bottom-centre of its box), because that's the part touching the floor. A box's head is not on the floor, so mapping it would give nonsense.`,
      code: py`
import cv2
import numpy as np

from perception.types import Track


class FloorMap:
    """Turns pixel positions into metres on the warehouse floor, using 4+ marked floor points."""

    def __init__(self, pixel_points: list[tuple[float, float]], floor_points_m: list[tuple[float, float]],
                 zones: dict[str, list[tuple[float, float]]], fps: float):
        self.H, _ = cv2.findHomography(np.float32(pixel_points), np.float32(floor_points_m), cv2.RANSAC)
        self.zones = {name: np.float32(poly).reshape(-1, 1, 2) for name, poly in zones.items()}
        self.fps = fps

    def to_floor(self, x: float, y: float) -> tuple[float, float]:
        pt = cv2.perspectiveTransform(np.float32([[[x, y]]]), self.H)[0, 0]
        return float(pt[0]), float(pt[1])

    def update(self, track: Track, keep: int = 20) -> None:
        track.history.append(self.to_floor(*track.foot_point()))
        del track.history[:-keep]

    def speed(self, track: Track, window: int = 5) -> float:
        """Metres per second over the last few frames (a window smooths out jittery boxes)."""
        h = track.history[-window:]
        if len(h) < 2:
            return 0.0
        dist = np.hypot(h[-1][0] - h[0][0], h[-1][1] - h[0][1])
        return float(dist * self.fps / (len(h) - 1))

    def zones_of(self, track: Track) -> set[str]:
        if not track.history:
            return set()
        x, y = track.history[-1]
        return {name for name, poly in self.zones.items() if cv2.pointPolygonTest(poly, (x, y), False) >= 0}


def distance_m(a: Track, b: Track) -> float:
    (ax, ay), (bx, by) = a.history[-1], b.history[-1]
    return float(np.hypot(ax - bx, ay - by))
`,
    },
    {
      file: "perception/rules.py",
      patterns: ["guardrails"],
      note: md`**The rules are plain code, on purpose.** Every number here (2 m, 0.5 m/s, 4 frames, 30 s) was agreed with the safety team and can be read out to the union rep. Two ideas stop the system from being noisy: **persistence** (the condition must hold for 4 frames in a row, so one jittery box can't fire an alert) and **cooldown** (the same person-forklift pair can fire at most once every 30 seconds, so one incident gives one alert, not 40). The ~clock~ is passed in so tests can control time.`,
      code: py`
import time
from dataclasses import dataclass, field

from perception.floor import FloorMap, distance_m
from perception.types import Detection, Track

NEAR_MISS_M = 2.0            # a person closer than 2 m to a MOVING forklift
FORKLIFT_MOVING_MPS = 0.5    # slower than this counts as parked
PERSIST_FRAMES = 4           # condition must hold 4 frames in a row (0.4 s) before it counts
COOLDOWN_S = 30              # one alert per pair / per person per 30 s, not one per frame


@dataclass
class Event:
    kind: str                         # "near_miss" | "no_vest_in_zone"
    camera: str
    track_ids: tuple[int, ...]
    started_at: float
    severity: float                   # 0..1, used to decide whether a second opinion is needed
    details: dict = field(default_factory=dict)


class RuleEngine:
    """Plain, testable code that turns tracks into safety events. No AI in here, on purpose."""

    def __init__(self, camera: str, floor: FloorMap, clock=time.time):
        self.camera, self.floor, self.clock = camera, floor, clock
        self._streak: dict[tuple, int] = {}
        self._last_fired: dict[tuple, float] = {}

    def _persisted(self, key: tuple, condition: bool) -> bool:
        """True only on the frame where the condition has held PERSIST_FRAMES times in a row."""
        self._streak[key] = self._streak.get(key, 0) + 1 if condition else 0
        return self._streak[key] == PERSIST_FRAMES

    def _cooled_down(self, key: tuple) -> bool:
        now = self.clock()
        if now - self._last_fired.get(key, -1e9) < COOLDOWN_S:
            return False
        self._last_fired[key] = now
        return True

    def check(self, tracks: list[Track], vests: list[Detection]) -> list[Event]:
        events = []
        people = [t for t in tracks if t.label == "person"]
        forklifts = [t for t in tracks if t.label == "forklift"]
        for f in forklifts:
            speed = self.floor.speed(f)
            for p in people:
                d = distance_m(p, f)
                key = ("near_miss", p.id, f.id)
                if self._persisted(key, d < NEAR_MISS_M and speed > FORKLIFT_MOVING_MPS) and self._cooled_down(key):
                    severity = min(1.0, (NEAR_MISS_M - d) / NEAR_MISS_M + speed / 4)
                    events.append(Event("near_miss", self.camera, (p.id, f.id), self.clock(), round(severity, 2),
                                        {"distance_m": round(d, 2), "forklift_speed_mps": round(speed, 2)}))
        for p in people:
            if "vest_required" not in self.floor.zones_of(p):
                continue
            has_vest = any(_inside(v.box, p.box) for v in vests)
            key = ("no_vest", p.id)
            if self._persisted(key, not has_vest) and self._cooled_down(key):
                events.append(Event("no_vest_in_zone", self.camera, (p.id,), self.clock(), 0.5))
        return events


def _inside(inner, outer, min_share: float = 0.6) -> bool:
    """Is at least 60% of the vest box inside the person box?"""
    x1, y1 = max(inner[0], outer[0]), max(inner[1], outer[1])
    x2, y2 = min(inner[2], outer[2]), min(inner[3], outer[3])
    overlap = max(0, x2 - x1) * max(0, y2 - y1)
    area = (inner[2] - inner[0]) * (inner[3] - inner[1])
    return area > 0 and overlap / area >= min_share
`,
    },
    {
      file: "perception/pipeline.py",
      patterns: ["observability", "guardrails"],
      note: md`**The live loop for one camera.** A background thread reads the camera and keeps only the **newest** frame (a queue of size 1): if the GPU falls behind, we skip frames instead of falling further and further behind real time. The main loop holds ~10 frames per second, runs detect → track → measure → decide, and keeps the last 6 seconds of **already-blurred** frames in a ring buffer, so an event comes with its evidence clip and no unblurred face is ever stored. Latency and detection counts are recorded per camera for dashboards.`,
      code: py`
import queue
import threading
import time
from collections import deque

import cv2
import numpy as np

from perception.detector import Detector
from perception.floor import FloorMap
from perception.rules import Event, RuleEngine
from perception.tracker import Tracker

TARGET_FPS = 10              # forklifts move ~3 m/s, so 10 frames a second is plenty
CLIP_SECONDS = 6             # keep the last 6 s of frames to build an evidence clip


def capture(url: str, frames: queue.Queue, stop: threading.Event):
    """Reads the camera as fast as it arrives, but only ever keeps the NEWEST frame waiting."""
    cap = cv2.VideoCapture(url)
    while not stop.is_set():
        ok, frame = cap.read()
        if not ok:
            time.sleep(1.0)                               # camera hiccup: wait and reconnect
            cap.release()
            cap = cv2.VideoCapture(url)
            continue
        if frames.full():
            try:
                frames.get_nowait()                       # drop the old frame: late data is useless for safety
            except queue.Empty:
                pass
        frames.put((time.time(), frame))


def blur_people(frame: np.ndarray, tracks) -> np.ndarray:
    """Privacy: blur the top third of every person box (where the face is) before anything leaves the box."""
    out = frame.copy()
    for t in tracks:
        if t.label != "person":
            continue
        x1, y1, x2, y2 = t.box.astype(int)
        y1, x1 = max(y1, 0), max(x1, 0)
        head_bottom = y1 + max((y2 - y1) // 3, 1)
        region = out[y1:head_bottom, x1:x2]
        if region.size:
            out[y1:head_bottom, x1:x2] = cv2.GaussianBlur(region, (51, 51), 0)
    return out


def run_camera(camera: str, url: str, detector: Detector, floor: FloorMap, on_event, metrics, stop: threading.Event):
    frames: queue.Queue = queue.Queue(maxsize=1)
    threading.Thread(target=capture, args=(url, frames, stop), daemon=True).start()
    tracker, rules = Tracker(), RuleEngine(camera, floor)
    recent = deque(maxlen=TARGET_FPS * CLIP_SECONDS)       # ring buffer: old frames fall off the end
    next_due = 0.0
    while not stop.is_set():
        try:
            captured_at, frame = frames.get(timeout=2)
        except queue.Empty:
            metrics.incr("camera_stalled", camera=camera)
            continue
        if captured_at < next_due:                        # skip frames to hold ~10 fps
            continue
        next_due = captured_at + 1 / TARGET_FPS
        dets = detector(frame)
        tracks = tracker.update([d for d in dets if d.label != "hi_vis_vest"])
        vests = [d for d in dets if d.label == "hi_vis_vest"]
        for t in tracks:
            floor.update(t)
        events: list[Event] = rules.check(tracks, vests)
        recent.append((captured_at, blur_people(frame, tracks), [(t.id, t.label, t.box.tolist()) for t in tracks]))
        metrics.observe("frame_latency_ms", (time.time() - captured_at) * 1000, camera=camera)
        metrics.observe("detections", len(dets), camera=camera)
        for e in events:
            on_event(e, list(recent))                     # hand over a copy of the clip with the event
`,
    },
    {
      file: "verify/vlm_check.py",
      patterns: ["model-cascade", "structured-output", "human-in-loop"],
      note: md`**The second opinion: a cascade.** Clear-cut events (very close, very fast) go straight to the supervisor list; tiny ones are only logged. Only the **unclear middle** goes to a vision-language model, which looks at three keyframes with the boxes drawn on and fills in a strict form: real event yes / no / unsure, and if not, *why* (a person on a mezzanine above the forklift is the classic false alarm: close in the image, but 4 m higher). "Unsure" goes to a human. "No" verdicts are kept, because they're perfect training examples of what fools the detector. The prompt states the privacy rule explicitly.`,
      code: py`
import base64
from typing import Literal

import anthropic
import cv2
from pydantic import BaseModel, Field

client = anthropic.Anthropic()
MODEL = "claude-sonnet-5-5"          # a fast vision-capable model is enough for a yes/no check
AUTO_CONFIRM = 0.75                  # rule severity above this: clear-cut, skip the second opinion
AUTO_DROP = 0.15                     # below this: log only, nobody is alerted

SYSTEM = """You review short CCTV keyframes from a warehouse safety system.
A rule fired because a person seemed too close to a moving forklift (or was missing a hi-vis vest).
Boxes are drawn and labelled with track ids. Faces are blurred on purpose; do not try to identify anyone.
Decide only from what is visible. Common false alarms: reflections, a person on a mezzanine ABOVE the forklift,
a forklift that is parked, a cardboard cut-out or poster, a person inside a protected walkway behind a barrier.
If the frames do not let you tell, answer "unsure"."""


class Verdict(BaseModel):
    real_event: Literal["yes", "no", "unsure"]
    false_alarm_reason: Literal["none", "different_floor_level", "parked_vehicle", "barrier_between",
                                "not_a_person", "detection_error", "other"]
    description: str = Field(description="One sentence a safety lead can read in 5 seconds")


def _jpeg_block(frame) -> dict:
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                        "data": base64.b64encode(buf.tobytes()).decode()}}


def _draw(frame, boxes):
    out = frame.copy()
    for tid, label, (x1, y1, x2, y2) in boxes:
        cv2.rectangle(out, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 255), 2)
        cv2.putText(out, f"{label} #{tid}", (int(x1), int(y1) - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
    return out


def triage(event, clip) -> dict:
    """The cascade: cheap rules decide the clear cases, the vision model only sees the unclear ones."""
    if event.severity >= AUTO_CONFIRM:
        return {"route": "alert", "by": "rules"}
    if event.severity < AUTO_DROP:
        return {"route": "log_only", "by": "rules"}
    picks = [clip[0], clip[len(clip) // 2], clip[-1]]          # before, middle, at the moment it fired
    content = [{"type": "text", "text": f"Rule: {event.kind}. Measurements: {event.details}. "
                                        f"Tracks involved: {list(event.track_ids)}. Three keyframes, oldest first:"}]
    content += [_jpeg_block(_draw(frame, boxes)) for _, frame, boxes in picks]
    resp = client.messages.parse(model=MODEL, max_tokens=400, system=SYSTEM,
                                 messages=[{"role": "user", "content": content}], output_format=Verdict)
    v: Verdict = resp.parsed_output
    if v.real_event == "yes":
        return {"route": "alert", "by": "vlm", "verdict": v.model_dump()}
    if v.real_event == "no":
        return {"route": "log_only", "by": "vlm", "verdict": v.model_dump()}   # kept: becomes training data
    return {"route": "human_review", "by": "vlm", "verdict": v.model_dump()}
`,
    },
    {
      file: "tests/test_rules.py",
      patterns: ["eval-harness"],
      note: md`**Testing perception logic without a camera.** We invent tiny scenes as lists of boxes (a forklift driving past a person, a parked forklift next to a person, a person in the vest zone) and run the real tracker, floor map and rules on them. These tests run in under a second on any laptop and pin down the behaviour the safety team signed off on: one alert per incident, parked forklifts never alert, missing vests are caught.`,
      code: py`
import numpy as np

from perception.floor import FloorMap
from perception.rules import RuleEngine
from perception.tracker import Tracker
from perception.types import Detection

# 1 pixel = 1 cm: a 1000x1000 pixel square is a 10x10 m floor area; the left half requires vests
FLOOR = dict(pixel_points=[(0, 0), (1000, 0), (1000, 1000), (0, 1000)],
             floor_points_m=[(0, 0), (10, 0), (10, 10), (0, 10)],
             zones={"vest_required": [(0, 0), (5, 0), (5, 10), (0, 10)]}, fps=10)


def run_scene(frames: int, forklift_px_per_frame: float, person_x: int = 600):
    floor, tracker, now = FloorMap(**FLOOR), Tracker(), [0.0]
    rules, events = RuleEngine("cam-test", floor, clock=lambda: now[0]), []
    for f in range(frames):
        now[0] = f / 10
        fx = 100 + forklift_px_per_frame * f
        dets = [Detection(np.array([fx, 300, fx + 100, 500], float), 0.9, "forklift"),
                Detection(np.array([person_x, 350, person_x + 40, 500], float), 0.8, "person")]
        tracks = tracker.update(dets)
        for t in tracks:
            floor.update(t)
        events += rules.check(tracks, vests=[])
    return events


def test_moving_forklift_passing_person_fires_once():
    events = [e for e in run_scene(40, forklift_px_per_frame=30) if e.kind == "near_miss"]
    assert len(events) == 1                           # cooldown: one alert, not one per frame
    assert events[0].details["distance_m"] < 2.0


def test_parked_forklift_next_to_person_is_not_a_near_miss():
    events = run_scene(40, forklift_px_per_frame=0, person_x=250)
    assert not [e for e in events if e.kind == "near_miss"]


def test_person_without_vest_in_vest_zone_is_flagged():
    events = run_scene(10, forklift_px_per_frame=0, person_x=200)   # x = 2 m, inside the vest zone
    assert [e for e in events if e.kind == "no_vest_in_zone"]
`,
    },
    {
      file: "evals/detection_eval.py",
      patterns: ["eval-harness"],
      note: md`**Is the detector good? mAP.** Sort all predicted boxes by confidence. Walk down the list: a box is a hit if it overlaps a real, not-yet-found object by IoU ≥ 0.5. At every point you get a precision (how many of my boxes so far were right) and a recall (how many real objects I've found so far). **AP** is the area under that precision-recall curve for one class; **mAP** is the average across classes. The report is **sliced** by camera, lighting and crowding, because a great average can hide a detector that is blind on the night shift.`,
      code: py`
from collections import defaultdict

import numpy as np

from perception.types import iou


def average_precision(preds, truths, label: str, iou_min: float = 0.5) -> float:
    """AP for one class. preds/truths: {image_id: [(label, box, score?)...]}. Area under the precision-recall curve."""
    gt = {img: np.array([b for l, b in boxes if l == label]).reshape(-1, 4) for img, boxes in truths.items()}
    used = {img: np.zeros(len(g), bool) for img, g in gt.items()}
    n_truth = sum(len(g) for g in gt.values())
    ranked = sorted(((s, img, b) for img, ps in preds.items() for l, b, s in ps if l == label), key=lambda x: -x[0])
    tp = np.zeros(len(ranked))
    for k, (_, img, box) in enumerate(ranked):
        g = gt.get(img, np.zeros((0, 4)))
        if len(g):
            overlaps = iou(np.array(box), g)[0]
            j = int(overlaps.argmax())
            if overlaps[j] >= iou_min and not used[img][j]:
                used[img][j], tp[k] = True, 1            # each real object may be found only once
    if n_truth == 0:
        return float("nan")
    cum_tp = np.cumsum(tp)
    recall = cum_tp / n_truth
    precision = cum_tp / np.arange(1, len(ranked) + 1)
    # make precision never go up as recall grows, then sum the area (the standard "all points" method)
    precision = np.maximum.accumulate(precision[::-1])[::-1] if len(precision) else precision
    r = np.concatenate([[0], recall])
    return float(np.sum((r[1:] - r[:-1]) * precision))


def report(preds, truths, image_tags: dict[str, dict], labels=("person", "forklift", "hi_vis_vest")) -> dict:
    """mAP overall AND per slice (camera, lighting, crowding): averages hide the night shift."""
    slices = defaultdict(set)
    for img, tags in image_tags.items():
        for key, value in tags.items():
            slices[f"{key}={value}"].add(img)
    out = {"all": {l: round(average_precision(preds, truths, l), 3) for l in labels}}
    for name, imgs in sorted(slices.items()):
        p = {i: preds.get(i, []) for i in imgs}
        t = {i: truths[i] for i in imgs if i in truths}
        out[name] = {l: round(average_precision(p, t, l), 3) for l in labels}
    return out
`,
    },
    {
      file: "evals/event_eval.py",
      patterns: ["eval-harness"],
      note: md`**Is the *system* good? Event metrics.** The client doesn't care about boxes; they care about near-misses. The safety team labels real events in 200 hours of recorded footage (with timestamps). We replay that footage through the whole pipeline and match predicted alerts to labelled events: same kind, same camera, within 3 seconds. Precision, recall and **alerts per shift** are the numbers that go into the brief's success criteria.`,
      code: py`
def match_events(predicted: list[dict], labelled: list[dict], tolerance_s: float = 3.0) -> dict:
    """Event-level scoring on replayed footage. An alert counts if it is the same kind, same camera, within 3 s."""
    used = set()
    tp = 0
    for p in sorted(predicted, key=lambda e: e["t"]):
        for i, g in enumerate(labelled):
            if i not in used and g["kind"] == p["kind"] and g["camera"] == p["camera"] and abs(g["t"] - p["t"]) <= tolerance_s:
                used.add(i)
                tp += 1
                break
    fp, fn = len(predicted) - tp, len(labelled) - tp
    return {"tp": tp, "fp": fp, "fn": fn,
            "precision": tp / max(tp + fp, 1), "recall": tp / max(tp + fn, 1),
            "missed": [g for i, g in enumerate(labelled) if i not in used]}


def alerts_per_shift(predicted: list[dict], hours: float, shift_hours: float = 8.0) -> float:
    """What supervisors feel: too many alerts per shift and they stop reading them."""
    return len(predicted) / hours * shift_hours
`,
    },
    {
      file: "ops/drift.py",
      patterns: ["observability", "feedback-flywheel"],
      note: md`**Keeping it working after launch.** Cameras get bumped, covered in dust, or blinded by a new skylight, and nobody tells you. Three cheap checks: **camera health** per frame (blur via the Laplacian, brightness), a **drift score** (PSI) that compares this week's detector-confidence pattern with the launch week's, and **active learning**: send the frames the model is *least sure* about to the labelling team, spread fairly across cameras. Those labels feed the next training run, which is tested in shadow mode before it replaces the current model.`,
      code: py`
import cv2
import numpy as np

BINS = np.linspace(0, 1, 11)


def camera_health(frame: np.ndarray) -> dict:
    """Cheap checks on one frame: is the camera blurred, blocked, too dark or overexposed?"""
    grey = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    sharpness = float(cv2.Laplacian(grey, cv2.CV_64F).var())     # low = blurry or covered lens
    brightness = float(grey.mean())
    return {"sharpness": round(sharpness, 1), "brightness": round(brightness, 1),
            "problem": "blurred_or_blocked" if sharpness < 20 else "too_dark" if brightness < 25
                       else "overexposed" if brightness > 235 else None}


def psi(baseline_scores: np.ndarray, current_scores: np.ndarray) -> float:
    """Population Stability Index: how much the detector's confidence pattern has shifted (> 0.2 = investigate)."""
    b = np.histogram(baseline_scores, BINS)[0] / max(len(baseline_scores), 1) + 1e-4
    c = np.histogram(current_scores, BINS)[0] / max(len(current_scores), 1) + 1e-4
    return float(np.sum((c - b) * np.log(c / b)))


def pick_for_labelling(frames: list[dict], budget: int = 200) -> list[dict]:
    """Active learning: send humans the frames the model is least sure about, spread across cameras."""
    def uncertainty(f):                                         # scores near 0.5 = the model is torn
        return max((1 - abs(s - 0.5) * 2 for s in f["scores"]), default=0.0)
    by_camera: dict[str, list] = {}
    for f in sorted(frames, key=uncertainty, reverse=True):
        by_camera.setdefault(f["camera"], []).append(f)
    picked = []
    while len(picked) < budget and any(by_camera.values()):
        for cam in list(by_camera):                             # round-robin so one noisy camera can't take it all
            if by_camera[cam] and len(picked) < budget:
                picked.append(by_camera[cam].pop(0))
    return picked
`,
    },
  ],

  evaluate: md`
Three layers of evaluation, each answering a different question:

| Layer | Metric | Target | Why |
|---|---|---|---|
| **Detector** | mAP@0.5 on cameras never seen in training | ≥ 0.80 overall, ≥ 0.70 on every slice (night, fisheye, crowded) | Can it see? Slices catch blind spots an average hides |
| **Tracker** | ID switches per 100 tracks, IDF1 | < 5 switches; IDF1 ≥ 0.75 | Unstable ids break speed, persistence and cooldowns |
| **Measurement** | Floor position error vs tape-measured points | < 0.3 m within 15 m of the camera | A 2 m rule is meaningless with 1 m errors |
| **System** | Near-miss recall / precision on 200 h replayed footage | ≥ 85% / ≥ 70% | The business outcome |
| **System** | Alerts per supervisor per shift | < 15 | Above this, people stop reading |
| **Speed** | Frame-to-warning-light latency | p95 < 1 s | Safety value |
| **Privacy** | Faces visible in a random sample of 500 stored clips | 0 | A hard requirement, checked by people |
| **Second opinion** | Vision model verdict vs safety-lead verdict on 300 unclear events | agreement ≥ 85%; "no" verdicts that were real events ≤ 3% | The model only earns the right to drop alerts if it rarely drops real ones |

> **Measure what the client feels.** A detector can go from 0.82 to 0.86 mAP and the system can still get *worse* if the new model's confidence scores shift and the rules now fire twice as often. Always re-run the event-level replay after changing any model, threshold or rule.

> **Watch out for leakage.** The test footage must come from cameras (or at least days) never used in training. Random frame splits make every vision model look 10–20 points better than it is.
`,

  operate: md`
- **Rollout:** one warehouse in **shadow mode** for 4 weeks (events recorded, nobody alerted) → compare with the safety team's own observations → enable supervisor reports → enable warning lights on forklifts last, once false alarm rates are known.
- **Per-camera onboarding:** a calibration checklist (4+ floor points, zone polygons, mounting height) and a 10-minute test walk with a tape measure. A camera without a passing calibration produces no alerts.
- **Model releases:** every new detector version runs in shadow next to the current one on the same frames for a week. It only replaces it if the event-level replay improves and no slice gets worse ([[p:eval-harness]]).
- **Monitoring** ([[p:observability]]): per-camera fps, latency, detections per minute, sharpness and brightness, weekly drift score; an alert when a camera goes dark, blurry or silent. Edge boxes report health every minute, even with zero events.
- **Cost:** ~28 edge boxes (~$1,500 each, once), electricity, and the second-opinion calls: ~300 events/day × ~60% unclear × ~$0.01 = ~$2/day. The labelling team's time is the biggest running cost.
- **Privacy operations:** clips auto-delete after 30 days; access to clips is logged ([[p:guardrails]]); a quarterly audit samples stored clips for visible faces; the union rep sees the rules file and the audit results.
- **Feedback loop** ([[p:feedback-flywheel]]): supervisor "not a real event" clicks and vision-model "no" verdicts become labelled examples; active learning picks the most confusing frames for the monthly retraining.
`,

  levelUp: md`
- **One camera can't see the whole aisle?** Multi-camera tracking: map every camera into one shared floor plan and hand tracks over between cameras. Ids now span cameras, so the privacy review must be redone.
- **Want to detect new things without labelling ("a spill", "a ladder left in an aisle")?** Open-vocabulary detectors and vision-language models can search for things described in words. Use them to *find* examples in archived footage, then train the small fast detector on those examples.
- **Forklifts with their own cameras?** The same pipeline runs on a small on-vehicle computer (a Jetson-class board) with a smaller, quantised model (8-bit numbers instead of 32-bit) to fit the power budget.
- **Many sites, many models?** A model registry, staged rollouts per site, and the same eval gate for every release: the perception version of [[proj:a04]] and [[proj:a07]].
`,

  exercises: [
    "Run ~tests/test_rules.py~, then add a test where the forklift drives straight *away* from the person: it should never alert. Does it? Why?",
    "Add an ~exit_blocked~ rule: a pallet or pallet jack standing inside the ~fire_exit~ zone for more than 60 seconds. Write the test first.",
    "Change ~SMOOTH~ in ~tracker.py~ from 0.6 to 0.2 and re-run the near-miss test. Explain in one sentence what changed and why.",
    "Take a photo of a floor with 4 tiles of known size, click their corners, and use ~FloorMap~ to measure something in the photo. How far off is it at the far edge?",
    "In ~detection_eval.py~, compute AP at IoU 0.75 as well as 0.5. Why do the scores drop, and which one matters more for a 2 m distance rule?",
    "Write the one-page privacy note for the union rep: what is detected, what is never detected, where video goes, how long it is kept, and who can see it.",
  ],

  interview: md`
> "Northgate wanted to find forklift near-misses using 1,100 existing cameras, with no face recognition. Napkin maths ruled out sending frames to a large model (about 950 million frames a day), so the seeing happens on site: a fine-tuned YOLO detector in ONNX Runtime on edge GPUs, a ByteTrack-style tracker for stable ids, and a per-camera homography that turns foot points into metres on the floor. The near-miss rule itself (under 2 m from a forklift moving over 0.5 m/s, for 0.4 s, with a 30 s cooldown) is plain, unit-tested Python, and it drives the sub-second warning light with no network call. Candidate events go through a cascade: clear cases skip ahead, unclear ones get a structured second opinion from a vision-language model on three blurred keyframes, and 'unsure' goes to a person. I evaluated at three levels: mAP sliced by camera and lighting with a camera-level split to avoid leakage, tracking ID switches, and event precision, recall and alerts-per-shift on 200 hours of labelled replay. After launch, camera-health checks, a drift score and active learning keep it accurate."
`,
});
