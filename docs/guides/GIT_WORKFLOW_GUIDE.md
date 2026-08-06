# Git Workflow Best Practices

## 🌳 Git Branching Strategy

### ⚠️ กฎสำคัญ: **ห้าม commit ตรงไปที่ master!**

```
master (production-ready) ← เฉพาะ merge เท่านั้น
  ↑
  └─ feature branches (development) ← commit ที่นี่
```

---

## 🎯 Workflow ที่ถูกต้อง

### 1. เริ่มงานใหม่ → สร้าง Branch

```powershell
# ตรวจสอบว่าอยู่ที่ master และ update ล่าสุด
git checkout master
git pull origin master

# สร้าง branch ใหม่สำหรับ feature/fix
git checkout -b feature/your-feature-name

# หรือ
git checkout -b fix/bug-description
```

### 2. ทำงานใน Branch

```powershell
# แก้ไขโค้ด...
# commit ตามปกติ
git add .
git commit -m "feat: add new feature"

# commit เพิ่มได้เรื่อยๆ
git add .
git commit -m "refactor: improve code structure"
```

### 3. Push Branch ขึ้น Remote

```powershell
# Push branch ครั้งแรก
git push -u origin feature/your-feature-name

# Push ครั้งต่อไป
git push
```

### 4. Merge เข้า Master (เมื่องานเสร็จ)

```powershell
# Switch ไปที่ master
git checkout master

# Update master ล่าสุด
git pull origin master

# Merge branch เข้ามา (--no-ff สร้าง merge commit)
git merge feature/your-feature-name --no-ff -m "Merge feature/your-feature-name"

# Push master
git push origin master
```

### 5. ลบ Branch (Optional)

```powershell
# ลบ local branch
git branch -d feature/your-feature-name

# ลบ remote branch
git push origin --delete feature/your-feature-name
```

---

## 📋 Branch Naming Convention

### Feature Branches
```
feature/add-user-authentication
feature/implement-dashboard
feature/avatar-upload-system
```

### Bug Fix Branches
```
fix/avatar-crash-on-delete
fix/startup-crash
fix/memory-leak-in-hooks
```

### Refactor Branches
```
refactor/cleanup-unused-imports
refactor/improve-error-handling
refactor/optimize-avatar-loading
```

### Documentation Branches
```
docs/add-api-documentation
docs/update-readme
docs/add-contributing-guide
```

### Chore Branches (maintenance)
```
chore/update-dependencies
chore/cleanup-old-files
chore/organize-documentation
```

---

## 🎨 Branch Types Explained

### 1. `master` (Main Branch)
- ✅ **Production-ready code only**
- ❌ **Never commit directly**
- ✅ **Only merge from other branches**
- 🔒 **Should be protected**

### 2. `develop` (Optional - for larger projects)
- Integration branch for features
- Testing ground before master

### 3. Feature Branches
- Short-lived
- One feature per branch
- Deleted after merge

### 4. Fix Branches
- Quick fixes for bugs
- Merge immediately after testing

---

## 💡 Best Practices

### ✅ DO:

1. **Create branch for every task**
   ```powershell
   git checkout -b fix/avatar-delete-crash
   ```

2. **Use descriptive branch names**
   - Good: `feature/add-avatar-compression`
   - Bad: `fix`, `test`, `new`

3. **Commit often with clear messages**
   ```powershell
   git commit -m "fix: prevent crash when deleting user avatar"
   ```

4. **Pull master before merging**
   ```powershell
   git checkout master
   git pull origin master
   git merge feature/your-branch --no-ff
   ```

5. **Delete branches after merge**
   ```powershell
   git branch -d feature/completed-feature
   git push origin --delete feature/completed-feature
   ```

### ❌ DON'T:

1. **❌ Commit directly to master**
   ```powershell
   # BAD
   git checkout master
   git add .
   git commit -m "quick fix"  # ❌ ห้าม!
   ```

2. **❌ Use vague branch names**
   ```powershell
   git checkout -b test  # ❌ ไม่ชัดเจน
   git checkout -b fix   # ❌ แก้อะไร?
   ```

3. **❌ Merge without testing**
   - Always test before merging to master

4. **❌ Keep long-lived branches**
   - Merge and delete when done

---

## 🔄 Current Situation Fix

### ปัญหาปัจจุบัน:
```
ea1e3b1 docs: Add comprehensive project run guide ← commit ตรงไปที่ master ❌
f024717 fix: CRITICAL - Prevent startup crash ← commit ตรงไปที่ master ❌
f903e26 fix: Enhanced avatar delete stability ← commit ตรงไปที่ master ❌
```

### วิธีแก้ไข - ตั้งแต่ตอนนี้เป็นต้นไป:

```powershell
# 1. ตรวจสอบว่าอยู่ที่ master
git branch
# * master

# 2. สร้าง branch ใหม่สำหรับงานถัดไป
git checkout -b fix/improve-error-handling

# 3. ทำงานใน branch ใหม่
# ... แก้ไขโค้ด ...
git add .
git commit -m "fix: add better error messages"

# 4. Push branch
git push -u origin fix/improve-error-handling

# 5. เมื่องานเสร็จ - merge เข้า master
git checkout master
git merge fix/improve-error-handling --no-ff
git push origin master

# 6. ลบ branch
git branch -d fix/improve-error-handling
git push origin --delete fix/improve-error-handling
```

---

## 🎯 Quick Reference

### Check current branch
```powershell
git branch
# * master  ← ถ้าเห็นอันนี้ และกำลังจะ commit = อันตราย!
```

### Switch to existing branch
```powershell
git checkout branch-name
```

### Create and switch to new branch
```powershell
git checkout -b new-branch-name
```

### List all branches
```powershell
# Local branches
git branch

# Remote branches
git branch -r

# All branches
git branch -a
```

### Delete branch
```powershell
# Local
git branch -d branch-name

# Remote
git push origin --delete branch-name
```

---

## 📊 Example Workflow

```powershell
# 1. Start new feature
git checkout master
git pull origin master
git checkout -b feature/add-user-settings

# 2. Work on feature
# ... code ...
git add .
git commit -m "feat: add settings page"

# ... more work ...
git add .
git commit -m "feat: add theme switcher"

# 3. Push to remote
git push -u origin feature/add-user-settings

# 4. Test thoroughly

# 5. Merge to master
git checkout master
git pull origin master
git merge feature/add-user-settings --no-ff -m "Merge feature/add-user-settings"
git push origin master

# 6. Cleanup
git branch -d feature/add-user-settings
git push origin --delete feature/add-user-settings
```

---

## 🚨 Emergency: If You Accidentally Committed to Master

```powershell
# 1. Create branch from current state
git branch fix/accidental-commit

# 2. Reset master to before your commits (use with caution!)
git reset --hard origin/master

# 3. Switch to your new branch
git checkout fix/accidental-commit

# 4. Now you have your changes in a branch
# Push and merge properly
git push -u origin fix/accidental-commit
```

**⚠️ Warning:** Only do this if you haven't pushed to remote yet!

---

## ✅ Checklist Before Every Commit

- [ ] Am I on the correct branch?
  ```powershell
  git branch  # ต้องไม่ใช่ * master
  ```
- [ ] Is my branch name descriptive?
- [ ] Have I tested the changes?
- [ ] Is my commit message clear?
- [ ] Did I pull latest master before creating branch?

---

## 📚 Additional Resources

- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**🎯 Remember:** 
- **Master = Production** 
- **Branches = Development**
- **Always create a branch before starting work!**

---

**📌 Pin this command to your brain:**
```powershell
git checkout -b <branch-name>  # ทำก่อนเริ่มงานทุกครั้ง!
```
