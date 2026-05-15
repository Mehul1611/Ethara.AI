import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import MemberRole, TaskPriority, TaskStatus


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    created_by_id: uuid.UUID
    created_at: datetime


class ProjectMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    role: MemberRole
    user: UserPublic


class AddMemberRequest(BaseModel):
    email: EmailStr
    role: MemberRole = MemberRole.member


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str | None = Field(default=None, max_length=10000)
    due_date: date | None = None
    priority: TaskPriority = TaskPriority.medium
    assignee_id: uuid.UUID | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = Field(default=None, max_length=10000)
    due_date: date | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    assignee_id: uuid.UUID | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: str | None
    due_date: date | None
    priority: TaskPriority
    status: TaskStatus
    assignee_id: uuid.UUID | None
    created_by_id: uuid.UUID
    created_at: datetime


class DashboardOut(BaseModel):
    total_tasks: int
    tasks_by_status: dict[str, int]
    tasks_per_user: list[dict]
    overdue_count: int
    overdue_tasks: list[TaskOut]
