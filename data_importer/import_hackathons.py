import os
import re
import requests

from datetime import datetime, timezone

from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()

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

db = client["HackHub"]

hackathons_collection = db["Hackathons"]
organizers_collection = db["Organizers"]
sources_collection = db["Sources"]
tags_collection = db["Tags"]

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
        return datetime.fromisoformat(
            str(value).replace("Z", "+00:00")
        )

    except Exception:
        return None


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

        "description":
            item.get(
                "description",
                ""
            ),

        "organizer":
            organizer_id,

        "source":
            source_id,

        "externalId":
            external_id,

        "tags":
            tag_ids,

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

        "eventStartDate":
            parse_date(
                item.get("eventStart")
            ),

        "eventEndDate":
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

    current_keys = set()


    # -----------------------------------------------------
    # CONVERT RECORDS
    # -----------------------------------------------------

    for item in records:

        try:

            external_id = str(
                item.get("id", "")
            ).strip()

            title = (
                item.get("title")
                or ""
            ).strip()

            source_name = (
                item.get("platform")
                or "Unknown"
            )


            # Missing external ID

            if not external_id:

                quarantined.append({
                    "title": title,
                    "reason":
                        "Missing external ID"
                })

                continue


            # Missing title

            if not title:

                quarantined.append({
                    "externalId":
                        external_id,
                    "reason":
                        "Missing title"
                })

                continue


            record = convert_record(item)


            current_keys.add(
                (
                    str(record["source"]),
                    record["externalId"]
                )
            )


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
                "title":
                    item.get(
                        "title",
                        "Unknown"
                    ),

                "reason":
                    str(error)
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


    # -----------------------------------------------------
    # MARK OLD RECORDS INACTIVE
    # -----------------------------------------------------

    existing_records = hackathons_collection.find(
        {
            "isActive": True
        },

        {
            "_id": 1,
            "source": 1,
            "externalId": 1
        }
    )


    deactivate_ids = []


    for existing in existing_records:

        key = (
            str(existing["source"]),
            str(existing["externalId"])
        )


        if key not in current_keys:

            deactivate_ids.append(
                existing["_id"]
            )


    if deactivate_ids:

        hackathons_collection.update_many(
            {
                "_id": {
                    "$in":
                        deactivate_ids
                }
            },

            {
                "$set": {
                    "isActive": False,
                    "status": "inactive",
                    "updatedAt": now()
                }
            }
        )


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
        f"{len(quarantined)}"
    )

    print(
        f"Old records marked inactive: "
        f"{len(deactivate_ids)}"
    )

    print(
        "Hackathon synchronization completed."
    )


    if quarantined:

        print()
        print("Quarantined records:")

        for record in quarantined:

            print(record)


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