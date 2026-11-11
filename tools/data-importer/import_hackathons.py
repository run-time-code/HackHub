import os
import re
import math
from pathlib import Path
import requests

from datetime import datetime, timezone

from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv


# =========================================================
# ENVIRONMENT
# =========================================================

script_env = Path(__file__).resolve().with_name(".env")
legacy_env = Path(__file__).resolve().parents[2] / "data_importer" / ".env"
env_file = script_env if script_env.is_file() else legacy_env
load_dotenv(dotenv_path=env_file if env_file.is_file() else None)

BRABBLE_API_KEY = os.getenv("BRABBLE_API_KEY")
MONGODB_URI = os.getenv("MONGODB_URI")

if not BRABBLE_API_KEY:
    raise ValueError("BRABBLE_API_KEY is missing from .env")

if not MONGODB_URI:
    raise ValueError("MONGODB_URI is missing from .env")


# =========================================================
# MONGODB
# =========================================================

client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=10000,
    connectTimeoutMS=10000,
    socketTimeoutMS=30000
)

database_name = os.getenv("MONGODB_DATABASE")
if not database_name:
    database_name = client.get_default_database(default="HackHub").name
db = client[database_name]

hackathons_collection = db["Hackathons"]
organizers_collection = db["Organizers"]
sources_collection = db["Sources"]
tags_collection = db["Tags"]
quarantine_collection = db["IngestionQuarantine"]

print("Connected to MongoDB")


# =========================================================
# BRABBLE API
# =========================================================

API_URL = "https://brabble.ai/api/listings"

HEADERS = {
    "x-api-key": BRABBLE_API_KEY
}


# =========================================================
# HELPERS
# =========================================================

def now():
    return datetime.now(timezone.utc)


def create_slug(title, external_id):

    title_part = re.sub(
        r"[^a-zA-Z0-9]+",
        "-",
        str(title or "hackathon").lower()
    ).strip("-")

    return f"{title_part}-{external_id}"


def normalize_array(value):

    if not value:
        return []

    if isinstance(value, list):
        return [
            str(item).strip()
            for item in value
            if str(item).strip()
        ]

    return [
        item.strip()
        for item in str(value).split(",")
        if item.strip()
    ]


def parse_date(value):

    if not value:
        return None

    try:
        parsed = datetime.fromisoformat(
            str(value).replace("Z", "+00:00")
        )
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    except Exception:
        return None


def validate_record(item):
    issues = []
    if not str(item.get("id", "")).strip():
        issues.append("Missing external ID")
    if not str(item.get("title") or "").strip():
        issues.append("Missing title")

    for field in ("deadline", "eventStart", "eventEnd"):
        value = item.get(field)
        if value and parse_date(value) is None:
            issues.append(f"Invalid date in {field}")

    prize = item.get("prize")
    if prize not in (None, ""):
        try:
            amount = float(prize)
            if not math.isfinite(amount):
                issues.append("Prize must be finite")
            elif amount < 0:
                issues.append("Prize must not be negative")
        except (TypeError, ValueError):
            issues.append("Prize must be numeric")

    mode = str(item.get("mode") or "").upper()
    if mode and mode not in {"ONLINE", "OFFLINE", "HYBRID"}:
        issues.append("Mode must be ONLINE, OFFLINE, or HYBRID")
    return issues


# =========================================================
# FETCH ALL HACKATHONS
# =========================================================

def fetch_all_hackathons():

    all_hackathons = []

    offset = 0
    limit = 100

    while True:

        params = {
            "hub": "hackathons",
            "limit": limit,
            "offset": offset
        }

        response = requests.get(
            API_URL,
            headers=HEADERS,
            params=params,
            timeout=30
        )

        response.raise_for_status()

        data = response.json()

        items = data.get("items", [])

        if not items:
            items = data.get("listings", [])

        if not items:
            break

        print(
            f"Fetched {len(items)} hackathons "
            f"(offset {offset})"
        )

        all_hackathons.extend(items)

        if len(items) < limit:
            break

        offset += limit

    return all_hackathons


# =========================================================
# STATUS
# =========================================================

def determine_status(deadline):

    deadline_date = parse_date(deadline)

    if not deadline_date:
        return "upcoming"

    if deadline_date < now():
        return "completed"

    return "upcoming"


# =========================================================
# GET / CREATE SOURCE
# =========================================================

def get_source_id(source_name):

    source_name = (
        str(source_name).strip()
        if source_name
        else "Unknown"
    )

    existing = sources_collection.find_one(
        {
            "name": source_name
        }
    )

    if existing:
        return existing["_id"]

    result = sources_collection.insert_one(
        {
            "name": source_name,
            "website": "",
            "apiUrl": API_URL,
            "isActive": True,
            "createdAt": now(),
            "updatedAt": now()
        }
    )

    return result.inserted_id


# =========================================================
# GET / CREATE ORGANIZER
# =========================================================

def get_organizer_id(organizer_name):

    organizer_name = (
        str(organizer_name).strip()
        if organizer_name
        else "Unknown Organizer"
    )

    existing = organizers_collection.find_one(
        {
            "name": organizer_name
        }
    )

    if existing:
        return existing["_id"]

    result = organizers_collection.insert_one(
        {
            "name": organizer_name,
            "description": "",
            "website": "",
            "logo": "",
            "createdAt": now(),
            "updatedAt": now()
        }
    )

    return result.inserted_id


# =========================================================
# GET / CREATE TAGS
# =========================================================

def get_tag_ids(tags):

    tag_ids = []

    for tag in normalize_array(tags):

        tag_name = tag.lower()

        existing = tags_collection.find_one(
            {
                "name": tag_name
            }
        )

        if existing:

            tag_ids.append(
                existing["_id"]
            )

        else:

            result = tags_collection.insert_one(
                {
                    "name": tag_name,
                    "createdAt": now(),
                    "updatedAt": now()
                }
            )

            tag_ids.append(
                result.inserted_id
            )

    return tag_ids


# =========================================================
# CONVERT BRABBLE RECORD
# =========================================================

def convert_record(item):

    external_id = str(
        item.get("id", "")
    ).strip()

    title = (
        item.get("title")
        or "Untitled Hackathon"
    ).strip()

    organizer_name = (
        item.get("organiser")
        or item.get("organizer")
        or "Unknown Organizer"
    )

    source_name = (
        item.get("platform")
        or "Unknown"
    )

    mode = str(
        item.get("mode")
        or "ONLINE"
    ).upper()

    if mode not in [
        "ONLINE",
        "OFFLINE",
        "HYBRID"
    ]:
        mode = "ONLINE"

    deadline = item.get("deadline")

    registration_deadline = parse_date(
        deadline
    )

    status = determine_status(
        deadline
    )

    try:

        prize = float(
            item.get("prize") or 0
        )

    except Exception:

        prize = 0

    source_id = get_source_id(
        source_name
    )

    organizer_id = get_organizer_id(
        organizer_name
    )

    tag_ids = get_tag_ids(
        item.get("tags")
    )

    return {

        "title":
            title,

        "slug":
            create_slug(
                title,
                external_id
            ),

        "hackathon_id":
            create_slug(
                title,
                external_id
            ),

        "description":
            item.get(
                "description",
                ""
            ),

        "organizerName":
            organizer_name,

        "sourceName":
            source_name,

        "organizer":
            organizer_id,

        "source":
            source_id,

        "externalId":
            external_id,

        "tags":
            tag_ids,

        "tagNames":
            normalize_array(
                item.get("tags")
            ),

        "skills":
            normalize_array(
                item.get("skills")
            ),

        "domain":
            normalize_array(
                item.get("domain")
            ),

        "mode":
            mode,

        "location":
            item.get(
                "city",
                ""
            ),

        "registrationDeadline":
            registration_deadline,

        "registration_deadline":
            registration_deadline.isoformat() if registration_deadline else None,

        "eventStartDate":
            parse_date(
                item.get("eventStart")
            ),

        "event_start_date":
            parse_date(
                item.get("eventStart")
            ),

        "eventEndDate":
            parse_date(
                item.get("eventEnd")
            ),

        "event_end_date":
            parse_date(
                item.get("eventEnd")
            ),

        "prize":
            prize,

        "status":
            status,

        "sourceUrl":
            item.get(
                "url",
                ""
            ),

        "isActive":
            True,

        "updatedAt":
            now()
    }


# =========================================================
# IMPORT
# =========================================================

def import_hackathons():

    records = fetch_all_hackathons()

    print(
        f"Total hackathons received: "
        f"{len(records)}"
    )

    if not records:
        print("No hackathons received.")
        return


    operations = []

    quarantined = []

    # -----------------------------------------------------
    # CONVERT RECORDS
    # -----------------------------------------------------

    for item in records:

        try:
            issues = validate_record(item)
            if issues:
                quarantined.append({
                    "record": item,
                    "issues": issues,
                    "status": "pending"
                })
                continue

            record = convert_record(item)


            operations.append(
                UpdateOne(
                    {
                        "source":
                            record["source"],

                        "externalId":
                            record["externalId"]
                    },

                    {
                        "$set":
                            record,

                        "$setOnInsert": {
                            "createdAt":
                                now()
                        }
                    },

                    upsert=True
                )
            )


        except Exception as error:

            quarantined.append({
                "record": item,
                "issues": [str(error)],
                "status": "failed"
            })


    # -----------------------------------------------------
    # BULK UPSERT
    # -----------------------------------------------------

    inserted = 0
    updated = 0

    if operations:

        result = hackathons_collection.bulk_write(
            operations,
            ordered=False
        )

        inserted = result.upserted_count
        updated = result.modified_count


    quarantined_count = 0
    if quarantined:
        quarantine_result = quarantine_collection.insert_many(quarantined, ordered=False)
        quarantined_count = len(quarantine_result.inserted_ids)


    # -----------------------------------------------------
    # OUTPUT
    # -----------------------------------------------------

    print()
    print(
        f"New hackathons inserted: "
        f"{inserted}"
    )

    print(
        f"Existing hackathons updated: "
        f"{updated}"
    )

    print(
        f"Invalid records quarantined: "
        f"{quarantined_count}"
    )

    print(
        "Hackathon synchronization completed."
    )


    if quarantined:

        print()
        print("Quarantined records:")

        for record in quarantined:
            print({
                "title": record["record"].get("title", "Unknown"),
                "issues": record["issues"]
            })


# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":

    try:

        import_hackathons()

    except KeyboardInterrupt:

        print()
        print("Import stopped by user.")

    except Exception as error:

        print()
        print(
            "Import failed:",
            error
        )