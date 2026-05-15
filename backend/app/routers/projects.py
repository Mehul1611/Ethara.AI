import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_project_or_404, require_project_admin, require_project_member
from app.models import MemberRole, Project, ProjectMember, Task, TaskStatus, User
from app.schemas import (
    AddMemberRequest,
    DashboardOut,
    ProjectCreate,
    ProjectMemberOut,
    ProjectOut,
    TaskCreate,
    TaskOut,
    UserPublic,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    body: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Project:
    project = Project(name=body.name, description=body.description, created_by_id=user.id)
    db.add(project)
    db.flush()
    db.add(ProjectMember(project_id=project.id, user_id=user.id, role=MemberRole.admin))
    db.commit()
    db.refresh(project)
    return project


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[Project]:
    stmt = (
        select(Project)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .where(ProjectMember.user_id == user.id)
        .order_by(Project.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Project:
    require_project_member(db, project_id, user)
    return get_project_or_404(db, project_id)


@router.get("/{project_id}/members", response_model=list[ProjectMemberOut])
def list_members(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ProjectMember]:
    require_project_member(db, project_id, user)
    stmt = select(ProjectMember).where(ProjectMember.project_id == project_id)
    rows = db.execute(stmt).scalars().all()
    out: list[ProjectMemberOut] = []
    for m in rows:
        db.refresh(m, ["user"])
        out.append(
            ProjectMemberOut(
                user_id=m.user_id,
                role=m.role,
                user=UserPublic.model_validate(m.user),
            )
        )
    return out


@router.post("/{project_id}/members", response_model=ProjectMemberOut, status_code=status.HTTP_201_CREATED)
def add_member(
    project_id: uuid.UUID,
    body: AddMemberRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectMemberOut:
    require_project_admin(db, project_id, user)
    target = db.execute(select(User).where(User.email == str(body.email).lower())).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    existing = db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == target.id,
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already a member")
    m = ProjectMember(project_id=project_id, user_id=target.id, role=body.role)
    db.add(m)
    db.commit()
    db.refresh(m)
    db.refresh(m, ["user"])
    return ProjectMemberOut(
        user_id=m.user_id,
        role=m.role,
        user=UserPublic.model_validate(m.user),
    )


@router.delete("/{project_id}/members/{member_user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    project_id: uuid.UUID,
    member_user_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    require_project_admin(db, project_id, user)
    m = db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == member_user_id,
        )
    ).scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    admin_count = db.execute(
        select(func.count())
        .select_from(ProjectMember)
        .where(ProjectMember.project_id == project_id, ProjectMember.role == MemberRole.admin)
    ).scalar_one()
    if m.role == MemberRole.admin and admin_count <= 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the last admin")
    db.delete(m)
    db.commit()


@router.get("/{project_id}/tasks", response_model=list[TaskOut])
def list_tasks(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Task]:
    require_project_member(db, project_id, user)
    stmt = select(Task).where(Task.project_id == project_id).order_by(Task.created_at.desc())
    return list(db.execute(stmt).scalars().all())


@router.post("/{project_id}/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: uuid.UUID,
    body: TaskCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Task:
    require_project_admin(db, project_id, user)
    if body.assignee_id:
        mem = db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == body.assignee_id,
            )
        ).scalar_one_or_none()
        if not mem:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignee must be a project member")
    task = Task(
        project_id=project_id,
        title=body.title,
        description=body.description,
        due_date=body.due_date,
        priority=body.priority,
        assignee_id=body.assignee_id,
        created_by_id=user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{project_id}/dashboard", response_model=DashboardOut)
def project_dashboard(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DashboardOut:
    require_project_member(db, project_id, user)
    today = datetime.now(timezone.utc).date()
    tasks = list(db.execute(select(Task).where(Task.project_id == project_id)).scalars().all())
    total = len(tasks)
    by_status: dict[str, int] = {s.value: 0 for s in TaskStatus}
    for t in tasks:
        by_status[t.status.value] = by_status.get(t.status.value, 0) + 1

    per_user: dict[str, dict] = {}

    for t in tasks:
        if t.assignee_id is None:
            k = "unassigned"
            if k not in per_user:
                per_user[k] = {"user_id": None, "name": "Unassigned", "email": None, "count": 0}
            per_user[k]["count"] += 1
        else:
            uid = str(t.assignee_id)
            if uid not in per_user:
                u = db.get(User, t.assignee_id)
                per_user[uid] = {
                    "user_id": str(t.assignee_id),
                    "name": u.name if u else "",
                    "email": str(u.email) if u else None,
                    "count": 0,
                }
            per_user[uid]["count"] += 1

    overdue_tasks = [
        t
        for t in tasks
        if t.due_date is not None and t.due_date < today and t.status != TaskStatus.done
    ]
    return DashboardOut(
        total_tasks=total,
        tasks_by_status=by_status,
        tasks_per_user=list(per_user.values()),
        overdue_count=len(overdue_tasks),
        overdue_tasks=[TaskOut.model_validate(x) for x in overdue_tasks],
    )
