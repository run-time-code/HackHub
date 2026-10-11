import os
import re
import requests
import unicodedata

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


def canonical_key(title, organizer_name, event_start_date):

    if not event_start_date:
        return None

    def normalize(value):
        return re.sub(
            r"[^a-z0-9]+",
            " ",
            unicodedata.normalize("NFKC", str(value or "")).lower()
        ).strip()

    if event_start_date.tzinfo is None:
        event_start_date = event_start_date.replace(tzinfo=timezone.utc)
    else:
        event_start_date = event_start_date.astimezone(timezone.utc)

    return "|".join([
        normalize(title),
        normalize(organizer_name),
        event_start_date.date().isoformat()
    ])


def parse_date(value):

    if not value:
        return None

    try:
        return datetime.fromisoformat(
            str(value).replace("Z", "+00:00")
        )

    except ValueError as error:
        raise ValueError("date must be a valid ISO-8601 value") from error


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

    except (TypeError, ValueError) as error:
        raise ValueError("prize must be a number") from error

    source_id = get_source_id(
        source_name
    )

    organizer_id = get_organizer_id(
        organizer_name
    )

    tag_names = normalize_array(item.get("tags"))
    tag_ids = get_tag_ids(tag_names)
    event_start_date = parse_date(item.get("eventStart"))
    source_url = item.get("url", "")

    return {

        "title":
            title,

        "slug":
            create_slug(
                title,
                f"{source_id}-{external_id}"
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

        "tagNames":
            [tag.lower() for tag in tag_names],

        "canonicalKey":
            canonical_key(
                title,
                organizer_name,
                event_start_date
            ),

        "isCanonical":
            True,

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
            event_start_date,

        "eventEndDate":
            parse_date(
                item.get("eventEnd")
            ),

        "prize":
            prize,

        "status":
            status,

        "sourceUrl":
            source_url,

        "sourceListings": [{
            "source": source_id,
            "externalId": external_id,
            "sourceUrl": source_url
        }],

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
    source_ids = set()
    canonical_groups = {}


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
                    "record": item,
                    "errors": ["Missing external ID"]
                })

                continue


            # Missing title

            if not title:

                quarantined.append({
                    "record": item,
                    "errors": ["Missing title"]
                })

                continue


            record = convert_record(item)


            current_keys.add(
                (
                    str(record["source"]),
                    record["externalId"]
                )
            )
            source_ids.add(record["source"])

            source_listing = {
                "source": record["source"],
                "externalId": record["externalId"],
                "sourceUrl": record.get("sourceUrl", "")
            }
            record.pop("sourceListings", None)

            canonical_identity = None
            key = record.get("canonicalKey")
            if key:
                canonical_identity = canonical_groups.get(key)
                if canonical_identity is None:
                    existing_canonical = hackathons_collection.find_one(
                        {"canonicalKey": key, "isCanonical": True},
                        {"source": 1, "externalId": 1}
                    )
                    if existing_canonical:
                        canonical_identity = (
                            existing_canonical["source"],
                            existing_canonical["externalId"]
                        )
                    else:
                        canonical_identity = (
                            record["source"],
                            record["externalId"]
                        )
                    canonical_groups[key] = canonical_identity

            if canonical_identity and canonical_identity != (
                record["source"],
                record["externalId"]
            ):
                record["isCanonical"] = False
                operations.append(
                    UpdateOne(
                        {
                            "source": canonical_identity[0],
                            "externalId": canonical_identity[1]
                        },
                        {
                            "$addToSet": {
                                "sourceListings": source_listing
                            }
                        }
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
                        "$set": record,

                        "$setOnInsert": {
                            "createdAt":
                                now()
                        },

                        "$addToSet": {
                            "sourceListings": source_listing
                        }
                    },

                    upsert=True
                )
            )


        except Exception as error:

            quarantined.append({
                "record": item,
                "errors": [str(error)]
            })


    # -----------------------------------------------------
    # BULK UPSERT
    # -----------------------------------------------------

    inserted = 0
    updated = 0

    if operations:

        result = hackathons_collection.bulk_write(
            operations,
            ordered=True
        )

        inserted = result.upserted_count
        updated = result.modified_count


    # -----------------------------------------------------
    # MARK OLD RECORDS INACTIVE
    # -----------------------------------------------------

    existing_records = hackathons_collection.find(
        {
            "isActive": True,
            "source": {"$in": list(source_ids)}
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

    if quarantined:
        quarantine_collection.insert_many([
            {
                "record": item["record"],
                "issues": item["errors"],
                "status": "pending",
                "createdAt": now(),
                "updatedAt": now()
            }
            for item in quarantined
        ])

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