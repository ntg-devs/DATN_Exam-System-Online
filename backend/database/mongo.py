from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb://username:password@localhost:27017"
DB_NAME = "exam_system"

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

exams_collection = db["exams"]
users_collection = db["users"]
classes_collection = db["classes"]
violates_collection = db["violates"]
exam_sessions_collection = db["exam_sessions"]